import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const ADMIN_ROLES = ['super_admin', 'admin'];

function hasMaliciousKeys(obj: Record<string, any>): boolean {
  return Object.keys(obj).some((k) => k.startsWith('$') || k.includes('.'));
}

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
      name: company.name,
      code: company.code,
      email: company.email,
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
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ADMIN_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const isSuperAdmin = auth.role === 'super_admin';
    const data = await req.json();
    if (hasMaliciousKeys(data)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });
    const { companyId: bodyCompanyId, enableGeoFencing, geoFenceRadius, officeLocation, workHours } = data;

    if (bodyCompanyId && !isSuperAdmin && bodyCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    // Admin acts only on session company; super_admin may pass any
    const companyId = isSuperAdmin ? (bodyCompanyId || auth.companyId) : auth.companyId;

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (enableGeoFencing !== undefined) updateData.enableGeoFencing = enableGeoFencing;
    if (geoFenceRadius !== undefined) updateData.geoFenceRadius = geoFenceRadius;
    if (officeLocation !== undefined) updateData.officeLocation = officeLocation;
    if (workHours !== undefined) updateData.workHours = workHours;

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
