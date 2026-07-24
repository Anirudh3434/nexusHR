import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';

export async function PATCH(req: Request) {
  try {
    await connectDB();
    const { companyId, payrollCycleDate, overtimeRate } = await req.json();

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
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

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
