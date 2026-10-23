import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Designation from '@/models/Designation';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const WRITE_ROLES = ['super_admin', 'admin', 'hr'];

function hasMaliciousKeys(obj: Record<string, any>): boolean {
  return Object.keys(obj).some((k) => k.startsWith('$') || k.includes('.'));
}

// GET all designations
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const isSuperAdmin = auth.role === 'super_admin';
    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    const department = searchParams.get('department');

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
    const { name, department, description } = data;

    if (!name || !companyId) {
      return NextResponse.json({ message: 'Name and company required' }, { status: 400 });
    }

    const desig = await Designation.create({ companyId, name, department, description });
    return NextResponse.json(desig, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error creating designation', error: error.message }, { status: 500 });
  }
}

// PATCH update designation
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    if (hasMaliciousKeys(body)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });
    const { id, name, department, description, isActive } = body;
    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const existing = await Designation.findById(id);
    if (!existing) return NextResponse.json({ message: 'Designation not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (department !== undefined) updateData.department = department;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

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
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const existing = await Designation.findById(id);
    if (!existing) return NextResponse.json({ message: 'Designation not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const desig = await Designation.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!desig) return NextResponse.json({ message: 'Designation not found' }, { status: 404 });

    return NextResponse.json({ message: 'Designation deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting designation', error: error.message }, { status: 500 });
  }
}
