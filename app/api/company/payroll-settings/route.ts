import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { encrypt, maskGeneric } from '@/lib/security/encryption';
import { testRazorpayXConnection, getRazorpayXConfig } from '@/lib/razorpayx';

const ADMIN_ROLES = ['super_admin', 'admin', 'hr'];

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

    const company = await Company.findById(companyId).select('payrollCycleDate overtimeRate razorpayxConfig');
    
    if (!company) {
      return NextResponse.json({ message: 'Company not found' }, { status: 404 });
    }

    const resolved = await getRazorpayXConfig(companyId);
    const companyRzp = company.razorpayxConfig || {};

    return NextResponse.json({ 
      payrollCycleDate: company.payrollCycleDate || 28,
      overtimeRate: company.overtimeRate || 1.5,
      razorpayxConfig: {
        enabled: Boolean(companyRzp.enabled),
        keyId: companyRzp.keyId || '',
        hasKeySecret: Boolean(companyRzp.keySecretEncrypted),
        keySecretMasked: companyRzp.keySecretEncrypted ? '••••••••••••••••' : '',
        accountNumber: companyRzp.accountNumber || '',
        webhookSecret: companyRzp.webhookSecret || '',
        defaultMode: companyRzp.defaultMode || 'IMPS',
        autoPayoutOnApproval: Boolean(companyRzp.autoPayoutOnApproval),
      },
      razorpayxStatus: {
        isConfigured: Boolean(resolved),
        source: resolved?.source || 'none',
        defaultMode: resolved?.defaultMode || 'IMPS',
        accountNumberMasked: resolved?.accountNumber ? maskGeneric(resolved.accountNumber, 4) : '',
        isMock: resolved?.isMock || false,
      }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error fetching payroll settings';
    return NextResponse.json({ message: 'Error fetching payroll settings', error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ADMIN_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const isSuperAdmin = auth.role === 'super_admin';
    const body = await req.json();
    const { 
      companyId: bodyCompanyId, 
      payrollCycleDate, 
      overtimeRate,
      razorpayxConfig,
      testConnection 
    } = body;

    if (bodyCompanyId && !isSuperAdmin && bodyCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = isSuperAdmin ? (bodyCompanyId || auth.companyId) : auth.companyId;

    if (!companyId) {
      return NextResponse.json({ message: 'Missing companyId' }, { status: 400 });
    }

    // If client requested to test connection only
    if (testConnection) {
      const testRes = await testRazorpayXConnection(
        razorpayxConfig?.keySecret ? {
          keyId: razorpayxConfig.keyId,
          keySecret: razorpayxConfig.keySecret,
          accountNumber: razorpayxConfig.accountNumber
        } : undefined,
        companyId
      );
      return NextResponse.json(testRes);
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ message: 'Company not found' }, { status: 404 });
    }

    if (payrollCycleDate !== undefined) company.payrollCycleDate = payrollCycleDate;
    if (overtimeRate !== undefined) company.overtimeRate = overtimeRate;

    if (razorpayxConfig) {
      if (!company.razorpayxConfig) {
        company.razorpayxConfig = {};
      }

      if (razorpayxConfig.enabled !== undefined) {
        company.razorpayxConfig.enabled = Boolean(razorpayxConfig.enabled);
      }
      if (razorpayxConfig.keyId !== undefined) {
        company.razorpayxConfig.keyId = razorpayxConfig.keyId.trim();
      }
      if (razorpayxConfig.keySecret && razorpayxConfig.keySecret.trim() && !razorpayxConfig.keySecret.startsWith('••')) {
        company.razorpayxConfig.keySecretEncrypted = encrypt(razorpayxConfig.keySecret.trim());
      }
      if (razorpayxConfig.accountNumber !== undefined) {
        company.razorpayxConfig.accountNumber = razorpayxConfig.accountNumber.trim();
      }
      if (razorpayxConfig.webhookSecret !== undefined) {
        company.razorpayxConfig.webhookSecret = razorpayxConfig.webhookSecret.trim();
      }
      if (razorpayxConfig.defaultMode !== undefined) {
        company.razorpayxConfig.defaultMode = razorpayxConfig.defaultMode;
      }
      if (razorpayxConfig.autoPayoutOnApproval !== undefined) {
        company.razorpayxConfig.autoPayoutOnApproval = Boolean(razorpayxConfig.autoPayoutOnApproval);
      }
    }

    await company.save();

    const resolved = await getRazorpayXConfig(companyId);

    return NextResponse.json({ 
      message: 'Payroll settings updated successfully', 
      payrollCycleDate: company.payrollCycleDate,
      overtimeRate: company.overtimeRate,
      razorpayxConfig: {
        enabled: Boolean(company.razorpayxConfig?.enabled),
        keyId: company.razorpayxConfig?.keyId || '',
        hasKeySecret: Boolean(company.razorpayxConfig?.keySecretEncrypted),
        accountNumber: company.razorpayxConfig?.accountNumber || '',
        webhookSecret: company.razorpayxConfig?.webhookSecret || '',
        defaultMode: company.razorpayxConfig?.defaultMode || 'IMPS',
        autoPayoutOnApproval: Boolean(company.razorpayxConfig?.autoPayoutOnApproval),
      },
      razorpayxStatus: {
        isConfigured: Boolean(resolved),
        source: resolved?.source || 'none',
        defaultMode: resolved?.defaultMode || 'IMPS',
        isMock: resolved?.isMock || false,
      }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error updating payroll settings';
    return NextResponse.json({ 
      message: 'Error updating payroll settings', 
      error: msg 
    }, { status: 500 });
  }
}
