import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Designation from '@/models/Designation';

// GET all designations
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const department = searchParams.get('department');
    
    const query: any = { isActive: true };
    if (companyId) query.companyId = companyId;
    if (department) query.department = department;
    
    const designations = await Designation.find(query).sort({ name: 1 });
    return NextResponse.json(designations);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching designations', error: error.message }, { status: 500 });
  }
}

// POST create designation
export async function POST(req: Request) {
  try {
    await connectDB();
    const data = await req.json();
    
    if (!data.name || !data.companyId) {
      return NextResponse.json({ message: 'Name and company required' }, { status: 400 });
    }

    const desig = await Designation.create(data);
    return NextResponse.json(desig, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error creating designation', error: error.message }, { status: 500 });
  }
}

// PATCH update designation
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const { id, ...updateData } = await req.json();
    
    const desig = await Designation.findByIdAndUpdate(id, updateData, { new: true });
    if (!desig) return NextResponse.json({ message: 'Designation not found' }, { status: 404 });
    
    return NextResponse.json(desig);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating designation', error: error.message }, { status: 500 });
  }
}

// DELETE designation
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });
    
    const desig = await Designation.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!desig) return NextResponse.json({ message: 'Designation not found' }, { status: 404 });
    
    return NextResponse.json({ message: 'Designation deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting designation', error: error.message }, { status: 500 });
  }
}
