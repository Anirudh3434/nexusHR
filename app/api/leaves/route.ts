import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Leave from '@/models/Leave';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

// GET leave requests
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const isSuperAdmin = auth.role === 'super_admin';
    const isEmployee = auth.role === 'employee';
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const queryCompanyId = searchParams.get('companyId');

    if (queryCompanyId && !isSuperAdmin && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    let query: any = {};
    // Tenant scope: always from session (super_admin may optionally filter)
    if (isSuperAdmin) {
      if (queryCompanyId) query.companyId = queryCompanyId;
      else if (auth.companyId) query.companyId = auth.companyId;
    } else {
      if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
      query.companyId = auth.companyId;
    }
    if (status) query.status = status;
    if (isEmployee) {
      // Employees see only their own leaves; ignore employeeId param
      query.employeeId = auth.userId;
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    const leaves = await Leave.find(query)
      .populate('employeeId', 'name department')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    const formattedLeaves = leaves.map(leave => ({
      ...leave.toObject(),
      id: leave._id.toString(),
      _id: undefined,
      employeeName: (leave.employeeId as any)?.name,
      department: (leave.employeeId as any)?.department,
    }));

    return NextResponse.json(formattedLeaves);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching leaves', error: error.message }, { status: 500 });
  }
}

// POST create leave request
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    const data = await req.json();

    // employeeId + companyId always from session; ignore body values
    const employeeId = auth.userId;
    const companyId = auth.companyId;
    const { type, startDate, endDate, totalDays, reason } = data;

    if (!type || !startDate || !endDate) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const newLeave = await Leave.create({
      employeeId,
      companyId,
      type,
      startDate,
      endDate,
      totalDays,
      reason,
      status: 'Pending',
    });

    return NextResponse.json({
      message: 'Leave request created successfully',
      id: newLeave._id,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error creating leave request', error: error.message }, { status: 500 });
  }
}

// PATCH update leave status
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr', 'manager'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const data = await req.json();

    // approvedBy always from session; ignore body value
    const { id, status, comment } = data;

    if (!id || !status) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const existing = await Leave.findById(id);
    if (!existing) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 });
    }
    // Same-company check (super_admin bypasses)
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    // Only Pending requests can transition
    if (existing.status !== 'Pending') {
      return NextResponse.json({ message: `Cannot update leave with status ${existing.status}` }, { status: 400 });
    }
    if (!['Approved', 'Rejected', 'Cancelled'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status transition' }, { status: 400 });
    }

    const leave = await Leave.findByIdAndUpdate(
      id,
      { status, approvedBy: auth.userId, comment },
      { new: true }
    );

    if (!leave) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Leave request updated successfully',
      leave,
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating leave request', error: error.message }, { status: 500 });
  }
}
