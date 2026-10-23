import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SalaryStructure from '@/models/SalaryStructure';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const NUMERIC_FIELDS = ['basicSalary', 'hra', 'da', 'conveyance', 'medical', 'specialAllowance', 'pf', 'esi', 'tds', 'professionalTax', 'grossSalary', 'totalDeductions', 'netSalary', 'ctc'];
const POST_ALLOWLIST = ['employeeId', 'effectiveDate', 'basicSalary', 'components', 'hra', 'da', 'conveyance', 'medical', 'specialAllowance', 'pf', 'esi', 'tds', 'professionalTax', 'grossSalary', 'totalDeductions', 'netSalary', 'ctc', 'notes'];
const PATCH_ALLOWLIST = ['effectiveDate', 'basicSalary', 'components', 'hra', 'da', 'conveyance', 'medical', 'specialAllowance', 'pf', 'esi', 'tds', 'professionalTax', 'grossSalary', 'totalDeductions', 'netSalary', 'ctc', 'notes', 'isActive'];

function pickAllowed(source: any, allowlist: string[]) {
  const out: any = {};
  for (const key of allowlist) {
    if (key in source && source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

function coerceNumerics(obj: any) {
  for (const key of NUMERIC_FIELDS) {
    if (obj[key] !== undefined) {
      const n = Number(obj[key]);
      if (Number.isNaN(n)) return key;
      obj[key] = n;
    }
  }
  return null;
}

// GET - Fetch salary structures
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    const employeeId = searchParams.get('employeeId');

    if (queryCompanyId && auth.role !== 'super_admin' && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = auth.role === 'super_admin' ? (queryCompanyId || auth.companyId) : auth.companyId;

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    const query: any = { companyId, isActive: true };
    if (employeeId) query.employeeId = employeeId;

    const salaries = await SalaryStructure.find(query)
      .populate('employeeId', 'name employeeId department designation')
      .populate('createdBy', 'name')
      .sort({ effectiveDate: -1 });

    return NextResponse.json(salaries);
  } catch (error) {
    console.error('Error fetching salary structures:', error);
    return NextResponse.json({ message: 'Failed to fetch salary structures' }, { status: 500 });
  }
}

// POST - Create new salary structure
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    if (body.companyId && auth.role !== 'super_admin' && body.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = auth.role === 'super_admin' ? (body.companyId || auth.companyId) : auth.companyId;
    if (!companyId) return NextResponse.json({ message: 'Company ID required' }, { status: 400 });

    const data = pickAllowed(body, POST_ALLOWLIST);
    if (!data.employeeId) return NextResponse.json({ message: 'employeeId required' }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(data.employeeId)) {
      return NextResponse.json({ message: 'Invalid employeeId' }, { status: 400 });
    }
    // Verify employee is in the same company
    const targetUser = await User.findById(data.employeeId).select('companyId');
    if (!targetUser) return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && targetUser.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const badKey = coerceNumerics(data);
    if (badKey) return NextResponse.json({ message: `Invalid ${badKey}` }, { status: 400 });
    if (data.effectiveDate) data.effectiveDate = new Date(data.effectiveDate);

    // Deactivate previous active salary for this employee
    await SalaryStructure.updateMany(
      { employeeId: data.employeeId, companyId, isActive: true },
      { isActive: false }
    );

    const salary = await SalaryStructure.create({ ...data, companyId, createdBy: auth.userId });
    return NextResponse.json(salary, { status: 201 });
  } catch (error) {
    console.error('Error creating salary structure:', error);
    return NextResponse.json({ message: 'Failed to create salary structure' }, { status: 500 });
  }
}

// PATCH - Update salary structure
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const { id } = body;

    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Valid salary ID required' }, { status: 400 });
    }
    const existing = await SalaryStructure.findById(id).select('companyId');
    if (!existing) {
      return NextResponse.json({ message: 'Salary structure not found' }, { status: 404 });
    }
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const updateData = pickAllowed(body, PATCH_ALLOWLIST);
    const badKey = coerceNumerics(updateData);
    if (badKey) return NextResponse.json({ message: `Invalid ${badKey}` }, { status: 400 });
    if (updateData.effectiveDate) updateData.effectiveDate = new Date(updateData.effectiveDate);

    const salary = await SalaryStructure.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!salary) {
      return NextResponse.json({ message: 'Salary structure not found' }, { status: 404 });
    }

    return NextResponse.json(salary);
  } catch (error) {
    console.error('Error updating salary structure:', error);
    return NextResponse.json({ message: 'Failed to update salary structure' }, { status: 500 });
  }
}

// DELETE - Deactivate salary structure
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Valid salary ID required' }, { status: 400 });
    }

    const existing = await SalaryStructure.findById(id).select('companyId');
    if (!existing) {
      return NextResponse.json({ message: 'Salary structure not found' }, { status: 404 });
    }
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const salary = await SalaryStructure.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!salary) {
      return NextResponse.json({ message: 'Salary structure not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Salary structure deactivated' });
  } catch (error) {
    console.error('Error deactivating salary structure:', error);
    return NextResponse.json({ message: 'Failed to deactivate salary structure' }, { status: 500 });
  }
}
