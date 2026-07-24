import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Department from '@/models/Department';

// GET all departments
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    
    const query: any = { isActive: true };
    if (companyId) query.companyId = companyId;
    
    const departments = await Department.find(query).sort({ name: 1 });
    return NextResponse.json(departments);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching departments', error: error.message }, { status: 500 });
  }
}

// POST create department
export async function POST(req: Request) {
  try {
    await connectDB();
    const data = await req.json();
    
    if (!data.name || !data.companyId) {
      return NextResponse.json({ message: 'Name and company required' }, { status: 400 });
    }

    const dept = await Department.create(data);
    return NextResponse.json(dept, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error creating department', error: error.message }, { status: 500 });
  }
}

// PATCH update department
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const { id, ...updateData } = await req.json();
    
    const dept = await Department.findByIdAndUpdate(id, updateData, { new: true });
    if (!dept) return NextResponse.json({ message: 'Department not found' }, { status: 404 });
    
    return NextResponse.json(dept);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating department', error: error.message }, { status: 500 });
  }
}

// DELETE department
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });
    
    const dept = await Department.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!dept) return NextResponse.json({ message: 'Department not found' }, { status: 404 });
    
    return NextResponse.json({ message: 'Department deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting department', error: error.message }, { status: 500 });
  }
}
