import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TdsCertificate from '@/models/TdsCertificate';
import ActivityLog from '@/models/ActivityLog';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET: Retrieve uploaded TRACES-issued Form 16 / Form 130 certificates
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const financialYear = searchParams.get('financialYear');
    const requestedEmployeeId = searchParams.get('employeeId');

    // Role-based scoping: regular employees can only query their own certificates
    const isElevated = hasRole(auth.role, ['super_admin', 'admin', 'hr']);
    const employeeId = isElevated ? (requestedEmployeeId || auth.userId) : auth.userId;
    const companyId = auth.companyId;

    const query: any = { employeeId };
    if (companyId && auth.role !== 'super_admin') {
      query.companyId = companyId;
    }
    if (financialYear) {
      query.financialYear = financialYear;
    }

    const certificates = await TdsCertificate.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      certificates,
      legalNotice: 'Official TDS Certificates are issued exclusively by TRACES (Income Tax Department).',
    });
  } catch (error: any) {
    console.error('TDS certificate fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error while fetching certificates' },
      { status: 500 }
    );
  }
}

/**
 * POST: Upload and register official TRACES-issued Form 16 / Form 130 PDF certificate
 * NexusHR does not self-generate legal certificates (Rule 7).
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden: Admin or HR access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      employeeId,
      financialYear,
      assessmentYear,
      certificateType, // 'FORM_16' | 'FORM_130'
      quarter = 'ANNUAL',
      part = 'COMBINED',
      fileName,
      fileUrl,
      fileSize,
      mimeType = 'application/pdf',
      tracesCertificateNumber,
      disclaimerAcknowledged,
      notes,
    } = body;

    const companyId = auth.role === 'super_admin' ? (body.companyId || auth.companyId) : auth.companyId;

    if (!employeeId || !financialYear || !certificateType || !fileUrl || !fileName) {
      return NextResponse.json(
        { message: 'employeeId, financialYear, certificateType, fileName, and fileUrl are required.' },
        { status: 400 }
      );
    }

    if (!disclaimerAcknowledged) {
      return NextResponse.json(
        { message: 'Mandatory confirmation required: Certificate must be an official TRACES-issued document.' },
        { status: 400 }
      );
    }

    // Upsert certificate entry for this employee & year
    const cert = await TdsCertificate.findOneAndUpdate(
      {
        employeeId,
        financialYear,
        certificateType,
        part,
        quarter,
      },
      {
        companyId,
        employeeId,
        financialYear,
        assessmentYear: assessmentYear || `${parseInt(financialYear.split('-')[0], 10) + 1}-${String(parseInt(financialYear.split('-')[0], 10) + 2).slice(-2)}`,
        certificateType,
        quarter,
        part,
        fileName,
        fileUrl,
        fileSize: fileSize || 0,
        mimeType,
        tracesCertificateNumber,
        uploadedBy: auth.userId,
        uploadedAt: new Date(),
        isVerified: true,
        disclaimerAcknowledged: true,
        notes,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Audit Log
    await ActivityLog.create({
      companyId,
      module: 'statutory',
      userId: auth.userId,
      userName: auth.name || 'System User',
      userEmail: auth.email,
      action: 'upload_tds_certificate',
      resourceType: certificateType,
      resourceName: `${certificateType}_${financialYear}`,
      description: `Uploaded official TRACES ${certificateType} for financial year ${financialYear} (File: ${fileName}).`,
      metadata: {
        certificateId: cert._id,
        employeeId,
        financialYear,
        certificateType,
        tracesCertificateNumber,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Official TRACES ${certificateType} recorded successfully.`,
      certificate: cert,
    });
  } catch (error: any) {
    console.error('TDS certificate upload error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error while saving certificate' },
      { status: 500 }
    );
  }
}
