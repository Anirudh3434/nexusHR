import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import {
  DEFAULT_PROBATION_MONTHS,
  addMonths,
  buildProbationWindow,
  getProbationInfo,
} from '@/lib/probation';

const MANAGE_ROLES = ['super_admin', 'admin', 'hr'];
const VIEW_ROLES = ['super_admin', 'admin', 'hr', 'manager'];

const PROBATION_FIELDS =
  'name email employeeId department designation avatar joiningDate probationStatus probationMonths probationStartDate probationEndDate probationConfirmedAt probationConfirmedBy probationNotes';

interface ProbationDoc {
  _id?: unknown;
  name?: string;
  email?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  avatar?: string;
  joiningDate?: Date | null;
  probationStatus?: 'on_probation' | 'confirmed' | null;
  probationMonths?: number | null;
  probationStartDate?: Date | null;
  probationEndDate?: Date | null;
  probationConfirmedAt?: Date | null;
  probationConfirmedBy?: { _id?: string; name?: string } | null;
  probationNotes?: string;
}

function serialize(user: ProbationDoc, now: Date) {
  const info = getProbationInfo(user, now);
  return {
    id: user._id ? String(user._id) : '',
    name: user.name || '',
    email: user.email || '',
    employeeId: user.employeeId || '',
    department: user.department || '',
    designation: user.designation || '',
    avatar: user.avatar || '',
    joiningDate: user.joiningDate || null,
    probationStatus: user.probationStatus ?? null,
    probationMonths: user.probationMonths ?? null,
    probationStartDate: user.probationStartDate || null,
    probationEndDate: user.probationEndDate || null,
    probationConfirmedAt: user.probationConfirmedAt || null,
    probationConfirmedBy: user.probationConfirmedBy || null,
    probationNotes: user.probationNotes || '',
    phase: info.phase,
    daysLeft: info.daysLeft,
  };
}

// GET — probation tracker. Employees only ever receive their own record.
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope');
    const isManagerView = hasRole(auth.role, VIEW_ROLES);
    const wantsSelf = scope === 'mine' || !isManagerView;

    if (wantsSelf) {
      const self = await User.findById(auth.userId).select(PROBATION_FIELDS).lean();
      if (!self) return NextResponse.json({ message: 'User not found' }, { status: 404 });
      return NextResponse.json({ employees: [serialize(self, now)], summary: null });
    }

    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    // Tracked records plus untracked recent joiners, so older workspaces can
    // backfill probation windows instead of silently missing them.
    const recentCutoff = addMonths(now, -12);
    const users = await User.find({
      companyId: auth.companyId,
      isCandidate: { $ne: true },
      $or: [
        { probationStatus: { $ne: null } },
        { probationEndDate: { $ne: null } },
        { joiningDate: { $gte: recentCutoff } },
      ],
    })
      .select(PROBATION_FIELDS)
      .sort({ probationEndDate: 1, joiningDate: -1 })
      .lean();

    const employees = users.map((user) => serialize(user, now));

    const summary = employees.reduce(
      (acc, employee) => {
        if (employee.phase === 'confirmed') acc.confirmed += 1;
        else if (employee.phase === 'overdue') acc.overdue += 1;
        else if (employee.phase === 'due_soon') acc.dueSoon += 1;
        else if (employee.phase === 'active') acc.onProbation += 1;
        else acc.untracked += 1;
        return acc;
      },
      { onProbation: 0, dueSoon: 0, overdue: 0, confirmed: 0, untracked: 0 }
    );

    return NextResponse.json({ employees, summary });
  } catch (error) {
    console.error('Error fetching probation:', error);
    return NextResponse.json(
      { message: 'Error fetching probation', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH — start / confirm / extend / reset / undo a probation window.
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, MANAGE_ROLES)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const body = await req.json();
    const { id, action, months, startDate, notes } = body || {};

    if (!id || !action) {
      return NextResponse.json({ message: 'Employee id and action are required' }, { status: 400 });
    }

    const employee = await User.findOne({ _id: id, companyId: auth.companyId });
    if (!employee) return NextResponse.json({ message: 'Employee not found' }, { status: 404 });

    const now = new Date();
    let actorName = '';

    switch (action) {
      case 'start': {
        const start = startDate ? new Date(startDate) : employee.joiningDate || now;
        if (isNaN(start.getTime())) {
          return NextResponse.json({ message: 'Invalid probation start date' }, { status: 400 });
        }
        const monthsValue = Number(months ?? DEFAULT_PROBATION_MONTHS);
        const window = buildProbationWindow(start, monthsValue);
        if (!window) {
          return NextResponse.json({ message: 'Probation months must be greater than zero' }, { status: 400 });
        }
        employee.probationStatus = 'on_probation';
        employee.probationMonths = window.months;
        employee.probationStartDate = window.startDate;
        employee.probationEndDate = window.endDate;
        employee.probationConfirmedAt = undefined;
        employee.probationConfirmedBy = undefined;
        break;
      }

      case 'confirm': {
        if (!employee.probationEndDate && !employee.probationStartDate) {
          return NextResponse.json({ message: 'Start probation before confirming it' }, { status: 400 });
        }
        const actor = await User.findById(auth.userId).select('name').lean<{ name?: string }>();
        actorName = actor?.name || '';
        employee.probationStatus = 'confirmed';
        employee.probationConfirmedAt = now;
        employee.probationConfirmedBy = { _id: auth.userId, name: actorName };
        break;
      }

      case 'extend': {
        const monthsValue = Number(months ?? 0);
        if (!Number.isFinite(monthsValue) || monthsValue <= 0) {
          return NextResponse.json({ message: 'Extension months must be greater than zero' }, { status: 400 });
        }
        if (!employee.probationEndDate) {
          return NextResponse.json({ message: 'No probation window to extend' }, { status: 400 });
        }
        employee.probationEndDate = addMonths(employee.probationEndDate, monthsValue);
        employee.probationMonths = (employee.probationMonths || 0) + monthsValue;
        employee.probationStatus = 'on_probation';
        employee.probationConfirmedAt = undefined;
        employee.probationConfirmedBy = undefined;
        break;
      }

      case 'reset': {
        const start = startDate ? new Date(startDate) : employee.probationStartDate || employee.joiningDate;
        if (!start || isNaN(start.getTime())) {
          return NextResponse.json({ message: 'Invalid probation start date' }, { status: 400 });
        }
        const monthsValue = Number(months ?? employee.probationMonths ?? DEFAULT_PROBATION_MONTHS);
        const window = buildProbationWindow(start, monthsValue);
        if (!window) {
          return NextResponse.json({ message: 'Probation months must be greater than zero' }, { status: 400 });
        }
        employee.probationStatus = 'on_probation';
        employee.probationMonths = window.months;
        employee.probationStartDate = window.startDate;
        employee.probationEndDate = window.endDate;
        employee.probationConfirmedAt = undefined;
        employee.probationConfirmedBy = undefined;
        break;
      }

      case 'undo': {
        if (!employee.probationEndDate) {
          return NextResponse.json({ message: 'Nothing to reopen' }, { status: 400 });
        }
        employee.probationStatus = 'on_probation';
        employee.probationConfirmedAt = undefined;
        employee.probationConfirmedBy = undefined;
        break;
      }

      default:
        return NextResponse.json({ message: `Unknown action: ${action}` }, { status: 400 });
    }

    if (notes !== undefined) employee.probationNotes = String(notes).slice(0, 500);

    await employee.save();

    return NextResponse.json({
      message: 'Probation updated',
      employee: serialize(employee.toObject(), now),
    });
  } catch (error) {
    console.error('Error updating probation:', error);
    return NextResponse.json(
      { message: 'Error updating probation', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
