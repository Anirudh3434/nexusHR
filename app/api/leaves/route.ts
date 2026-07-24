import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Leave from '@/models/Leave';

// GET leave requests
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    let query: any = {};
    if (status) query.status = status;
    if (employeeId) query.employeeId = employeeId;

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
    const data = await req.json();

    const { employeeId, companyId, type, startDate, endDate, totalDays, reason } = data;

    if (!employeeId || !companyId || !type || !startDate || !endDate) {
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
    const data = await req.json();

    const { id, status, approvedBy, comment } = data;

    if (!id || !status) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const leave = await Leave.findByIdAndUpdate(
      id,
      { status, approvedBy, comment },
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
