import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Department from '@/models/Department';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const WRITE_ROLES = ['super_admin', 'admin', 'hr'];

function hasMaliciousKeys(obj: Record<string, any>): boolean {
  return Object.keys(obj).some((k) => k.startsWith('$') || k.includes('.'));
}

// GET all departments
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const isSuperAdmin = auth.role === 'super_admin';
    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');

    if (queryCompanyId && !isSuperAdmin && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const query: any = { isActive: true };
    if (isSuperAdmin) {
      if (queryCompanyId) query.companyId = queryCompanyId;
      else if (auth.companyId) query.companyId = auth.companyId;
    } else {
      if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
      query.companyId = auth.companyId;
    }

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
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const isSuperAdmin = auth.role === 'super_admin';
    const data = await req.json();
    if (hasMaliciousKeys(data)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });

    if (data.companyId && !isSuperAdmin && data.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = isSuperAdmin ? (data.companyId || auth.companyId) : auth.companyId;
    const { name, description } = data;

    if (!name || !companyId) {
      return NextResponse.json({ message: 'Name and company required' }, { status: 400 });
    }

    const dept = await Department.create({ companyId, name, description });
    return NextResponse.json(dept, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error creating department', error: error.message }, { status: 500 });
  }
}

// PATCH update department
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    if (hasMaliciousKeys(body)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });
    const { id, name, description, isActive } = body;
    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const existing = await Department.findById(id);
    if (!existing) return NextResponse.json({ message: 'Department not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

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
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const existing = await Department.findById(id);
    if (!existing) return NextResponse.json({ message: 'Department not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const dept = await Department.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!dept) return NextResponse.json({ message: 'Department not found' }, { status: 404 });

    return NextResponse.json({ message: 'Department deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting department', error: error.message }, { status: 500 });
  }
}
