import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SalaryStructure from '@/models/SalaryStructure';

// GET - Fetch salary structures
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const employeeId = searchParams.get('employeeId');

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
    const body = await req.json();

    // Deactivate previous active salary for this employee
    await SalaryStructure.updateMany(
      { employeeId: body.employeeId, isActive: true },
      { isActive: false }
    );

    const salary = await SalaryStructure.create(body);
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
    const body = await req.json();
    const { id, ...updateData } = body;

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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Salary ID required' }, { status: 400 });
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
