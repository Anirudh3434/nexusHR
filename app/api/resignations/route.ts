import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Resignation from '@/models/Resignation';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { notify } from '@/lib/notify';
import type { Role } from '@/lib/permissions';

const APPROVER_ROLES = ['admin', 'hr', 'manager'];
const PENDING_STATUSES = ['pending', 'under_review'];

const shortDate = (value: Date | string) =>
  new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

// GET - Fetch resignations
export async function GET(req: Request) {
  try {
    await connectDB();

    // Get user info from the verified session (never query/body).
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = auth.userId;
    const userRole = auth.role || 'employee';
    const companyId = auth.companyId;

    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    if (queryCompanyId && queryCompanyId !== companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const myResignation = searchParams.get('myResignation');

    const query: any = {};

    // Role-based filtering — company always from the session.
    if (userRole === 'employee') {
      // Employees can only see their own resignation
      query.submittedBy = userId;
      if (companyId) query.companyId = companyId;
    } else {
      if (!companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
      query.companyId = companyId;
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (status) {
      query.status = status;
    }

    if (myResignation === 'true') {
      query.submittedBy = userId;
    }

    const resignations = await Resignation.find(query)
      .populate('employeeId', 'name firstName lastName email employeeId department designation')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ resignations });
  } catch (error: any) {
    console.error('Error fetching resignations:', error);
    return NextResponse.json({ message: 'Error fetching resignations', error: error.message }, { status: 500 });
  }
}

// POST - Submit new resignation
export async function POST(req: Request) {
  try {
    await connectDB();

    // Get user info from the verified session.
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const userId = auth.userId;
    // Identity bound from the session: employees submit for themselves, in their own company.
    const employeeId = userId;
    const companyId = auth.companyId;

    const body = await req.json();
    const { lastWorkingDate, reason, detailedReason, noticePeriodDays } = body;

    // Validation
    if (!lastWorkingDate || !reason || !noticePeriodDays) {
      return NextResponse.json({
        message: 'Missing required fields',
        required: ['lastWorkingDate', 'reason', 'noticePeriodDays']
      }, { status: 400 });
    }

    // Check if employee already has an active resignation (scoped to session company)
    const existingResignation = await Resignation.findOne({
      employeeId,
      companyId,
      status: { $in: ['pending', 'under_review', 'approved'] }
    });

    if (existingResignation) {
      return NextResponse.json({
        message: 'You already have an active resignation request',
        existingResignation: {
          id: existingResignation._id,
          status: existingResignation.status,
          submittedAt: existingResignation.createdAt
        }
      }, { status: 409 });
    }

    // Validate last working date is in the future
    const lwd = new Date(lastWorkingDate);
    if (lwd < new Date()) {
      return NextResponse.json({ message: 'Last working date must be in the future' }, { status: 400 });
    }

    const resignation = await Resignation.create({
      employeeId,
      companyId,
      submittedBy: userId,
      resignationDate: new Date(),
      lastWorkingDate: lwd,
      reason,
      detailedReason,
      noticePeriodDays,
      status: 'pending',
      clearanceStatus: 'pending',
    });

    const populatedResignation = await Resignation.findById(resignation._id)
      .populate('employeeId', 'name firstName lastName email employeeId department designation')
      .populate('submittedBy', 'name email');

    // HR and managers get the action item in their login digest.
    await notify({
      companyId,
      kind: 'resignation',
      title: '{actor} submitted a resignation',
      message: `Last working day ${shortDate(lwd)} · ${noticePeriodDays} days notice.`,
      href: '/resignations',
      meta: 'Action needed',
      actorId: userId,
      dedupeKey: `resignation:${resignation._id}`,
      roles: APPROVER_ROLES as Role[],
    });

    return NextResponse.json({
      message: 'Resignation submitted successfully',
      resignation: populatedResignation
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting resignation:', error);
    return NextResponse.json({ message: 'Error submitting resignation', error: error.message }, { status: 500 });
  }
}

// PATCH - Update resignation status
export async function PATCH(req: Request) {
  try {
    await connectDB();

    // Get user info from the verified session.
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const userId = auth.userId;
    const userRole = auth.role || 'employee';
    const companyId = auth.companyId;

    // Only admin/hr/manager can update resignation status
    if (!hasRole(userRole, APPROVER_ROLES)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    const body = await req.json();
    const { id, status, hrRemarks, exitInterviewCompleted, exitInterviewNotes, assetsReturned, assetsReturnedNotes, clearanceStatus } = body;

    if (!id) {
      return NextResponse.json({ message: 'Resignation ID is required' }, { status: 400 });
    }

    // Scoped lookup first.
    const existing = await Resignation.findOne({ _id: id, companyId });
    if (!existing) {
      return NextResponse.json({ message: 'Resignation not found' }, { status: 404 });
    }

    // Atomic status transition: only a pending record can move; concurrent
    // approvers get 409 instead of silently overwriting each other.
    if (status) {
      if (!PENDING_STATUSES.includes(existing.status)) {
        return NextResponse.json({ message: 'Cannot change status of processed resignation' }, { status: 400 });
      }
      const statusUpdate: any = { status };
      if (status === 'approved') {
        statusUpdate.approvedBy = userId;
        statusUpdate.approvedAt = new Date();
      }
      const claimed = await Resignation.findOneAndUpdate(
        { _id: id, companyId, status: { $in: PENDING_STATUSES } },
        { $set: statusUpdate },
        { new: true }
      );
      if (!claimed) {
        return NextResponse.json({ message: 'Resignation was already processed by another approver' }, { status: 409 });
      }
    }

    const updateData: any = {};
    if (hrRemarks !== undefined) updateData.hrRemarks = hrRemarks;
    if (exitInterviewCompleted !== undefined) updateData.exitInterviewCompleted = exitInterviewCompleted;
    if (exitInterviewNotes !== undefined) updateData.exitInterviewNotes = exitInterviewNotes;
    if (assetsReturned !== undefined) updateData.assetsReturned = assetsReturned;
    if (assetsReturnedNotes !== undefined) updateData.assetsReturnedNotes = assetsReturnedNotes;
    if (clearanceStatus !== undefined) updateData.clearanceStatus = clearanceStatus;

    let resignation;
    if (Object.keys(updateData).length > 0) {
      resignation = await Resignation.findOneAndUpdate(
        { _id: id, companyId },
        { $set: updateData },
        { new: true }
      )
        .populate('employeeId', 'name firstName lastName email employeeId department designation')
        .populate('submittedBy', 'name email')
        .populate('approvedBy', 'name email');
    } else {
      resignation = await Resignation.findOne({ _id: id, companyId })
        .populate('employeeId', 'name firstName lastName email employeeId department designation')
        .populate('submittedBy', 'name email')
        .populate('approvedBy', 'name email');
    }

    if (!resignation) {
      return NextResponse.json({ message: 'Resignation not found' }, { status: 404 });
    }

    // Keep the employee posted on their own resignation.
    if (status) {
      await notify({
        companyId,
        kind: 'resignation',
        title: `Resignation ${String(status).replace('_', ' ')}`,
        message: `Last working day ${shortDate(existing.lastWorkingDate)}.${
          hrRemarks ? ` ${hrRemarks}` : ''
        }`,
        href: '/my-resignation',
        meta: String(status).replace('_', ' '),
        recipientIds: [String(existing.employeeId)],
        actorId: userId,
        dedupeKey: `resignation-status:${id}:${status}`,
      });
    }

    return NextResponse.json({
      message: 'Resignation updated successfully',
      resignation
    });
  } catch (error: any) {
    console.error('Error updating resignation:', error);
    return NextResponse.json({ message: 'Error updating resignation', error: error.message }, { status: 500 });
  }
}

// DELETE - Withdraw resignation (only by employee who submitted it)
export async function DELETE(req: Request) {
  try {
    await connectDB();

    // Get user info from the verified session.
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const userId = auth.userId;
    const userRole = auth.role || 'employee';
    const companyId = auth.companyId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Resignation ID is required' }, { status: 400 });
    }

    const resignation = await Resignation.findOne({ _id: id, companyId });

    if (!resignation) {
      return NextResponse.json({ message: 'Resignation not found' }, { status: 404 });
    }

    // Only the submitter or approver-role staff can withdraw/delete
    if (resignation.submittedBy.toString() !== userId && !hasRole(userRole, APPROVER_ROLES)) {
      return NextResponse.json({ message: 'You can only withdraw your own resignation' }, { status: 403 });
    }

    // Can only withdraw if not already approved or rejected
    if (['approved', 'rejected'].includes(resignation.status)) {
      return NextResponse.json({
        message: `Cannot withdraw resignation with status: ${resignation.status}`
      }, { status: 400 });
    }

    // Soft delete by marking as withdrawn
    resignation.status = 'withdrawn';
    await resignation.save();

    return NextResponse.json({ message: 'Resignation withdrawn successfully' });
  } catch (error: any) {
    console.error('Error withdrawing resignation:', error);
    return NextResponse.json({ message: 'Error withdrawing resignation', error: error.message }, { status: 500 });
  }
}
