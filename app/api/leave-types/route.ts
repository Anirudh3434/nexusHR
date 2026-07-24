import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LeaveType from '@/models/LeaveType';

// GET all leave types
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    const query: any = { isActive: true };
    if (companyId) query.companyId = companyId;

    const leaveTypes = await LeaveType.find(query).sort({ name: 1 });
    return NextResponse.json(leaveTypes);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching leave types', error: error.message }, { status: 500 });
  }
}

// POST create leave type
export async function POST(req: Request) {
  try {
    await connectDB();
    const data = await req.json();

    if (!data.name || !data.code || !data.companyId) {
      return NextResponse.json({ message: 'Name, code and companyId required' }, { status: 400 });
    }

    const leaveType = await LeaveType.create(data);
    return NextResponse.json(leaveType, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error creating leave type', error: error.message }, { status: 500 });
  }
}

// PATCH update leave type
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const { id, ...updateData } = await req.json();

    const leaveType = await LeaveType.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
    if (!leaveType) return NextResponse.json({ message: 'Leave type not found' }, { status: 404 });

    return NextResponse.json(leaveType);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating leave type', error: error.message }, { status: 500 });
  }
}

// DELETE leave type
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const leaveType = await LeaveType.findByIdAndUpdate(id, { isActive: false }, { returnDocument: 'after' });
    if (!leaveType) return NextResponse.json({ message: 'Leave type not found' }, { status: 404 });

    return NextResponse.json({ message: 'Leave type deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting leave type', error: error.message }, { status: 500 });
  }
}
