import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import ActivityLog from '@/models/ActivityLog';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import {
  resolveCompanyRules,
  validateCompanyStatutorySettings,
  simulateStatutoryImpact,
} from '@/services/statutory/ruleResolverService';

export const runtime = 'nodejs';

/**
 * GET: Fetch company statutory settings & resolved rules
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    const companyId = auth.role === 'super_admin' ? (queryCompanyId || auth.companyId) : auth.companyId;

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    const company = await Company.findById(companyId).select('name statutoryConfig gstNumber panNumber').lean();
    if (!company) {
      return NextResponse.json({ message: 'Company not found' }, { status: 404 });
    }

    const now = new Date();
    const resolved = await resolveCompanyRules(companyId, now.getFullYear(), now.getMonth());

    return NextResponse.json({
      companyId,
      statutoryConfig: company.statutoryConfig || {},
      resolvedRules: resolved,
    });
  } catch (error: any) {
    console.error('Error fetching statutory settings:', error);
    return NextResponse.json({ message: 'Failed to fetch statutory settings', error: error.message }, { status: 500 });
  }
}

/**
 * POST: Preview impact simulation of proposed statutory settings
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const queryCompanyId = body.companyId;
    const companyId = auth.role === 'super_admin' ? (queryCompanyId || auth.companyId) : auth.companyId;

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    const validation = validateCompanyStatutorySettings(body.statutoryConfig);
    if (!validation.valid) {
      return NextResponse.json({ message: 'Invalid statutory settings', errors: validation.errors }, { status: 400 });
    }

    const simulation = await simulateStatutoryImpact(companyId, body.statutoryConfig);
    return NextResponse.json({ simulation });
  } catch (error: any) {
    console.error('Error simulating statutory impact:', error);
    return NextResponse.json({ message: 'Failed to simulate statutory impact', error: error.message }, { status: 500 });
  }
}

/**
 * PUT: Update company statutory settings with validation and audit log
 */
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const queryCompanyId = body.companyId;
    const companyId = auth.role === 'super_admin' ? (queryCompanyId || auth.companyId) : auth.companyId;

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    const { statutoryConfig } = body;
    const validation = validateCompanyStatutorySettings(statutoryConfig);
    if (!validation.valid) {
      return NextResponse.json({
        message: 'Statutory settings rejected: must equal or exceed statutory minimums',
        errors: validation.errors,
      }, { status: 400 });
    }

    const existingCompany = await Company.findById(companyId);
    if (!existingCompany) {
      return NextResponse.json({ message: 'Company not found' }, { status: 404 });
    }

    const previousConfig = existingCompany.statutoryConfig;

    statutoryConfig.general = {
      ...statutoryConfig.general,
      effectiveDate: new Date(),
      lastUpdatedBy: auth.userId,
    };

    existingCompany.statutoryConfig = statutoryConfig;
    await existingCompany.save();

    // Create Audit Log entry
    await ActivityLog.create({
      companyId: existingCompany._id,
      userId: auth.userId,
      userName: auth.name || 'Admin',
      userEmail: auth.email,
      module: 'statutory',
      actionType: 'statutory_config_updated',
      action: 'Updated statutory configuration',
      oldValue: previousConfig,
      newValue: statutoryConfig,
      description: 'Updated Indian statutory compliance configuration (PF, ESI, PT, TDS)',
    });

    const now = new Date();
    const resolved = await resolveCompanyRules(companyId, now.getFullYear(), now.getMonth());

    return NextResponse.json({
      message: 'Statutory configuration updated successfully',
      statutoryConfig: existingCompany.statutoryConfig,
      resolvedRules: resolved,
    });
  } catch (error: any) {
    console.error('Error updating statutory settings:', error);
    return NextResponse.json({ message: 'Failed to update statutory settings', error: error.message }, { status: 500 });
  }
}
