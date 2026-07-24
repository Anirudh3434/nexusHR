import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LeaveEntitlement from '@/models/LeaveEntitlement';
import LeaveType from '@/models/LeaveType';

// GET leave entitlements
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const leaveTypeId = searchParams.get('leaveTypeId');
    const years = searchParams.get('years'); // Employee years of service

    let query: any = { isActive: true };
    if (companyId) query.companyId = companyId;
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
    const data = await req.json();

    if (!data.leaveTypeId || !data.companyId || !data.tierName) {
      return NextResponse.json({ message: 'LeaveType, company and tier name required' }, { status: 400 });
    }

    const entitlement = await LeaveEntitlement.create(data);
    return NextResponse.json(entitlement, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error creating entitlement', error: error.message }, { status: 500 });
  }
}

// PATCH update entitlement
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const { id, ...updateData } = await req.json();

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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const entitlement = await LeaveEntitlement.findByIdAndUpdate(id, { isActive: false }, { returnDocument: 'after' });
    if (!entitlement) return NextResponse.json({ message: 'Entitlement not found' }, { status: 404 });

    return NextResponse.json({ message: 'Entitlement deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting entitlement', error: error.message }, { status: 500 });
  }
}
