import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WorkShift from '@/models/WorkShift';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const WRITE_ROLES = ['super_admin', 'admin', 'hr'];

function hasMaliciousKeys(obj: Record<string, any>): boolean {
  return Object.keys(obj).some((k) => k.startsWith('$') || k.includes('.'));
}

// GET - Fetch all shifts for a company
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
    const companyId = isSuperAdmin ? (queryCompanyId || auth.companyId) : auth.companyId;

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
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const isSuperAdmin = auth.role === 'super_admin';
    const body = await req.json();
    if (hasMaliciousKeys(body)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });

    if (body.companyId && !isSuperAdmin && body.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = isSuperAdmin ? (body.companyId || auth.companyId) : auth.companyId;
    if (!companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    const { name, startTime, endTime, workingDays, lateThreshold } = body;
    if (!name || !startTime || !endTime) {
      return NextResponse.json({ message: 'Name, startTime and endTime required' }, { status: 400 });
    }

    const shift = await WorkShift.create({ companyId, name, startTime, endTime, workingDays, lateThreshold });
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
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    if (hasMaliciousKeys(body)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });
    const { id, name, startTime, endTime, workingDays, lateThreshold } = body;
    if (!id) return NextResponse.json({ message: 'Shift ID required' }, { status: 400 });

    const existing = await WorkShift.findById(id);
    if (!existing) return NextResponse.json({ message: 'Shift not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (workingDays !== undefined) updateData.workingDays = workingDays;
    if (lateThreshold !== undefined) updateData.lateThreshold = lateThreshold;

    const shift = await WorkShift.findByIdAndUpdate(id, updateData, { new: true });

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
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Shift ID required' }, { status: 400 });
    }

    const existing = await WorkShift.findById(id);
    if (!existing) return NextResponse.json({ message: 'Shift not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
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
