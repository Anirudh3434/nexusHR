import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const ADMIN_ROLES = ['super_admin', 'admin'];

export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ADMIN_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const isSuperAdmin = auth.role === 'super_admin';
    const body = await req.json();
    const { companyId: bodyCompanyId, payrollCycleDate, overtimeRate } = body;

    if (bodyCompanyId && !isSuperAdmin && bodyCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = isSuperAdmin ? (bodyCompanyId || auth.companyId) : auth.companyId;

    if (!companyId) {
      return NextResponse.json({ message: 'Missing companyId' }, { status: 400 });
    }

    const updateData: any = {};
    if (payrollCycleDate !== undefined) updateData.payrollCycleDate = payrollCycleDate;
    if (overtimeRate !== undefined) updateData.overtimeRate = overtimeRate;

    const company = await Company.findByIdAndUpdate(
      companyId,
      updateData,
      { new: true }
    );

    if (!company) {
      return NextResponse.json({ message: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Payroll settings updated', 
      payrollCycleDate: company.payrollCycleDate,
      overtimeRate: company.overtimeRate
    });
  } catch (error: any) {
    return NextResponse.json({ 
      message: 'Error updating payroll settings', 
      error: error.message 
    }, { status: 500 });
  }
}

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
      return NextResponse.json({ message: 'Missing companyId' }, { status: 400 });
    }

    const company = await Company.findById(companyId).select('payrollCycleDate overtimeRate');
    
    if (!company) {
      return NextResponse.json({ message: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      payrollCycleDate: company.payrollCycleDate || 28,
      overtimeRate: company.overtimeRate || 1.5
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching payroll settings' }, { status: 500 });
  }
}
