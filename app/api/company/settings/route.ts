import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';

// GET company rules/settings
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return NextResponse.json({ message: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({
      enableGeoFencing: company.enableGeoFencing,
      geoFenceRadius: company.geoFenceRadius,
      officeLocation: company.officeLocation,
      workHours: company.workHours,
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching company settings', error: error.message }, { status: 500 });
  }
}

// PATCH update company rules/settings
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const data = await req.json();
    const { companyId, ...updateData } = data;

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return NextResponse.json({ message: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Company settings updated successfully',
      settings: {
        enableGeoFencing: updatedCompany.enableGeoFencing,
        geoFenceRadius: updatedCompany.geoFenceRadius,
        officeLocation: updatedCompany.officeLocation,
        workHours: updatedCompany.workHours,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating company settings', error: error.message }, { status: 500 });
  }
}
