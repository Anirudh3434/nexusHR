import { NextResponse, NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { grantPortalAccess, hireCandidate, resetPortalPassword } from '@/lib/hireService';
import { canEditApi } from '@/lib/api-guard';

function getOrigin(req: Request): string {
  const headersList = new Headers(req.headers);
  const host = headersList.get('host') || 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') || headersList.get('origin') ? new URL(headersList.get('origin')!).protocol.replace(':', '') : 'http';
  const origin = headersList.get('origin') || `${proto}://${host}`;
  if (origin === 'null://' || origin.includes('null')) {
    return 'http://localhost:3000';
  }
  return origin;
}

// POST /api/applicants/hire
// body: { applicationId, action?: 'hire' | 'portal' | 'resend', joiningDate?, ctc?, position?, department?, employmentType? }
export async function POST(req: NextRequest) {
  const guard = canEditApi(req, 'recruitment');
  if (!guard.authorized) return guard.response;

  try {
    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    if (!companyId) {
      return NextResponse.json({ message: 'Company context missing' }, { status: 400 });
    }

    const actor = {
      _id: headersList.get('x-user-id') || '',
      name: headersList.get('x-user-name') || 'HR',
      email: headersList.get('x-user-email') || '',
    };

    const body = await req.json();
    const { applicationId, action = 'hire', joiningDate, ctc, position, department, employmentType } = body;

    if (!applicationId) {
      return NextResponse.json({ message: 'applicationId is required' }, { status: 400 });
    }

    const origin = getOrigin(req);

    if (action === 'resend') {
      const result = await resetPortalPassword({
        companyId,
        actor,
        applicationId,
        origin,
      });
      return NextResponse.json({ message: 'Password reset and email sent', ...result });
    }

    if (action === 'portal') {
      const result = await grantPortalAccess({
        companyId,
        actor,
        applicationId,
        origin,
      });
      return NextResponse.json({
        message: result.alreadyHasAccess
          ? 'Portal access was already granted earlier'
          : 'Portal access granted — credentials emailed to the candidate',
        ...result,
      });
    }

    const result = await hireCandidate({
      companyId,
      actor,
      applicationId,
      joiningDate,
      ctc,
      position,
      department,
      employmentType,
      origin,
    });

    return NextResponse.json({
      message: result.alreadyHired ? 'Candidate already hired — notification email sent' : 'Candidate hired successfully',
      ...result,
    });
  } catch (error: any) {
    console.error('Error in hire flow:', error);
    return NextResponse.json({ message: 'Error in hire flow', error: error.message }, { status: 500 });
  }
}
