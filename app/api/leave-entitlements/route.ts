import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LeaveEntitlement from '@/models/LeaveEntitlement';
import LeaveType from '@/models/LeaveType';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const WRITE_ROLES = ['super_admin', 'admin', 'hr'];

function hasMaliciousKeys(obj: Record<string, any>): boolean {
  return Object.keys(obj).some((k) => k.startsWith('$') || k.includes('.'));
}

// GET leave entitlements
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const isSuperAdmin = auth.role === 'super_admin';
    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    const leaveTypeId = searchParams.get('leaveTypeId');
    const years = searchParams.get('years'); // Employee years of service

    if (queryCompanyId && !isSuperAdmin && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    let query: any = { isActive: true };
    if (isSuperAdmin) {
      if (queryCompanyId) query.companyId = queryCompanyId;
      else if (auth.companyId) query.companyId = auth.companyId;
    } else {
      if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
      query.companyId = auth.companyId;
    }
    if (leaveTypeId) query.leaveTypeId = leaveTypeId;

    // If years provided, find applicable entitlements
    if (years !== null) {
      const y = parseFloat(years);
      query.minYears = { $lte: y };
      query.$or = [
        { maxYears: null },
        { maxYears: { $gte: y } }
      ];
    }

    const entitlements = await LeaveEntitlement.find(query)
      .populate('leaveTypeId', 'name code color isPaid')
      .sort({ minYears: 1 });

    return NextResponse.json(entitlements);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching entitlements', error: error.message }, { status: 500 });
  }
}

// POST create entitlement
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
    const { leaveTypeId, tierName, minYears, maxYears, daysPerYear, accrualType, canCarryForward, maxCarryForwardDays } = data;

    if (!leaveTypeId || !companyId || !tierName) {
      return NextResponse.json({ message: 'LeaveType, company and tier name required' }, { status: 400 });
    }

    const entitlement = await LeaveEntitlement.create({
      companyId, leaveTypeId, tierName, minYears, maxYears, daysPerYear,
      accrualType, canCarryForward, maxCarryForwardDays,
    });
    return NextResponse.json(entitlement, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error creating entitlement', error: error.message }, { status: 500 });
  }
}

// PATCH update entitlement
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    if (hasMaliciousKeys(body)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });
    const { id, leaveTypeId, tierName, minYears, maxYears, daysPerYear, accrualType, canCarryForward, maxCarryForwardDays, isActive } = body;
    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const existing = await LeaveEntitlement.findById(id);
    if (!existing) return NextResponse.json({ message: 'Entitlement not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const updateData: any = {};
    if (leaveTypeId !== undefined) updateData.leaveTypeId = leaveTypeId;
    if (tierName !== undefined) updateData.tierName = tierName;
    if (minYears !== undefined) updateData.minYears = minYears;
    if (maxYears !== undefined) updateData.maxYears = maxYears;
    if (daysPerYear !== undefined) updateData.daysPerYear = daysPerYear;
    if (accrualType !== undefined) updateData.accrualType = accrualType;
    if (canCarryForward !== undefined) updateData.canCarryForward = canCarryForward;
    if (maxCarryForwardDays !== undefined) updateData.maxCarryForwardDays = maxCarryForwardDays;
    if (isActive !== undefined) updateData.isActive = isActive;

    const entitlement = await LeaveEntitlement.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
    if (!entitlement) return NextResponse.json({ message: 'Entitlement not found' }, { status: 404 });

    return NextResponse.json(entitlement);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating entitlement', error: error.message }, { status: 500 });
  }
}

// DELETE entitlement
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const existing = await LeaveEntitlement.findById(id);
    if (!existing) return NextResponse.json({ message: 'Entitlement not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const entitlement = await LeaveEntitlement.findByIdAndUpdate(id, { isActive: false }, { returnDocument: 'after' });
    if (!entitlement) return NextResponse.json({ message: 'Entitlement not found' }, { status: 404 });

    return NextResponse.json({ message: 'Entitlement deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting entitlement', error: error.message }, { status: 500 });
  }
}
