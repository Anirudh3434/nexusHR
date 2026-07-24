import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WorkShift from '@/models/WorkShift';

// GET - Fetch all shifts for a company
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    const shifts = await WorkShift.find({ companyId }).sort({ createdAt: -1 });
    return NextResponse.json(shifts);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json({ message: 'Failed to fetch shifts' }, { status: 500 });
  }
}

// POST - Create new shift
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    
    const shift = await WorkShift.create(body);
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ message: 'Failed to create shift' }, { status: 500 });
  }
}

// PATCH - Update shift
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, ...updateData } = body;

    const shift = await WorkShift.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!shift) {
      return NextResponse.json({ message: 'Shift not found' }, { status: 404 });
    }

    return NextResponse.json(shift);
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json({ message: 'Failed to update shift' }, { status: 500 });
  }
}

// DELETE - Delete shift
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Shift ID required' }, { status: 400 });
    }

    const shift = await WorkShift.findByIdAndDelete(id);
    if (!shift) {
      return NextResponse.json({ message: 'Shift not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json({ message: 'Failed to delete shift' }, { status: 500 });
  }
}
