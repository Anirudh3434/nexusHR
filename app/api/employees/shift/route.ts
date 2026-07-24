import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Employee from '@/models/Employee';

// PATCH - Update employee shift assignment
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { employeeId, workShiftId } = body;

    if (!employeeId) {
      return NextResponse.json({ message: 'Employee ID required' }, { status: 400 });
    }

    const employee = await Employee.findByIdAndUpdate(
      employeeId,
      { workShiftId: workShiftId || null },
      { new: true }
    ).populate('workShiftId');

    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error updating employee shift:', error);
    return NextResponse.json({ message: 'Failed to update shift assignment' }, { status: 500 });
  }
}

// GET - Get employees by shift
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const shiftId = searchParams.get('shiftId');
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    const query: any = { companyId, status: 'Active' };
    if (shiftId) query.workShiftId = shiftId;

    const employees = await Employee.find(query)
      .populate('workShiftId', 'name startTime endTime')
      .populate('userId', 'email')
      .sort({ firstName: 1 });

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ message: 'Failed to fetch employees' }, { status: 500 });
  }
}
