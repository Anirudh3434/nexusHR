import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import connectDB from '@/lib/mongodb';
import JobApplication from '@/models/JobApplication';
import { grantPortalAccess, hireCandidate, notifyRejection } from '@/lib/hireService';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const RECRUITMENT_ROLES = ['admin', 'hr', 'manager'];

const STATUS_ENUM = ['new', 'under_review', 'considered', 'rejected', 'shortlisted', 'interview', 'hired', 'spam'];

// Allowed status transitions in the hiring pipeline
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  new: ['under_review', 'considered', 'rejected', 'shortlisted', 'spam'],
  under_review: ['considered', 'shortlisted', 'interview', 'rejected', 'spam'],
  considered: ['shortlisted', 'interview', 'rejected'],
  shortlisted: ['interview', 'hired', 'rejected'],
  interview: ['hired', 'rejected', 'shortlisted'],
  rejected: [],
  hired: [],
  spam: [],
};

// GET applicants (all applications with Job ID - both website and email)
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    if (queryCompanyId && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const source = searchParams.get('source'); // Optional: filter by source
    const status = searchParams.get('status');
    const showGeneral = searchParams.get('showGeneral') === 'true';
    const jobId = searchParams.get('jobId');
    const query: any = { companyId: auth.companyId };

    // Default: Only show applications with a jobId
    // If showGeneral is true, we show EVERYTHING (all sources/general)
    if (!showGeneral && !jobId) {
      query.jobId = { $nin: [null, '', undefined] };
    }

    // Optional source filter
    if (source) {
      query.source = source;
    }

    if (status) {
      query.status = status;
    }

    if (jobId) {
      query.jobId = jobId;
    }

    const applications = await JobApplication.find(query)
      .sort({ receivedAt: -1 })
      .lean();

    return NextResponse.json({ applications });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching applicants', error: error.message }, { status: 500 });
  }
}

// PATCH update applicant status
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, RECRUITMENT_ROLES)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const body = await req.json();
    const { id, status, rejectionReason, joiningDate, ctc, position, department, employmentType } = body;

    if (!id || !status) {
      return NextResponse.json({ message: 'ID and status required' }, { status: 400 });
    }

    if (!STATUS_ENUM.includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    // Scoped lookup: applicant must belong to the session company
    const existing = await JobApplication.findOne({ _id: id, companyId: auth.companyId });
    if (!existing) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    // Validate status transition (same-status is a no-op update)
    if (status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json({
          message: `Status transition from "${existing.status}" to "${status}" is not allowed`,
          error: 'TRANSITION_NOT_ALLOWED',
        }, { status: 400 });
      }
    }

    // Explicit allowlist (no body spread)
    const update: any = { status };
    if (rejectionReason !== undefined) {
      update.rejectionReason = rejectionReason;
    }

    const application = await JobApplication.findOneAndUpdate(
      { _id: id, companyId: auth.companyId },
      update,
      { new: true }
    );

    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    const headersList = await headers();
    const companyId = auth.companyId;
    const origin = req.headers.get('origin') || `http://${req.headers.get('host') || 'localhost:3000'}`;
    const actor = {
      _id: auth.userId || '',
      name: headersList.get('x-user-name') || 'HR',
      email: auth.email || '',
    };

    // Auto-grant portal access: when an applicant is considered/shortlisted, create
    // their temporary account + email credentials so they can track the pipeline.
    if (['considered', 'shortlisted'].includes(status) && companyId) {
      try {
        const portal = await grantPortalAccess({ companyId, actor, applicationId: id, origin });
        return NextResponse.json({
          ...application.toObject(),
          portal: {
            password: portal.password,
            email: portal.email,
            accountCreated: portal.accountCreated,
            alreadyHasAccess: portal.alreadyHasAccess,
          },
        });
      } catch (error: any) {
        return NextResponse.json({
          ...application.toObject(),
          message: 'Applicant considered, but portal access setup failed',
          error: error.message,
        }, { status: 200 });
      }
    }

    // Auto-hire: when an applicant is marked hired, create the portal account +
    // onboarding and email their credentials immediately.
    if (status === 'hired' && companyId) {
      try {
        const hireResult = await hireCandidate({
          companyId,
          actor,
          applicationId: id,
          joiningDate,
          ctc,
          position,
          department,
          employmentType,
          origin,
        });
        return NextResponse.json({
          ...hireResult.application.toObject(),
          hired: {
            password: hireResult.password,
            email: hireResult.email,
            onboardingId: hireResult.onboarding._id,
            accountCreated: hireResult.accountCreated,
          },
        });
      } catch (error: any) {
        return NextResponse.json({
          message: 'Application marked as hired, but the portal access setup failed',
          error: error.message,
        }, { status: 200 });
      }
    }

    // Auto-notify: when an applicant is rejected, email them the decision.
    if (status === 'rejected' && companyId) {
      try {
        await notifyRejection({
          companyId,
          applicationId: id,
          origin,
          reason: rejectionReason || '',
        });
      } catch (error: any) {
        console.error('Rejection email failed:', error);
      }
    }

    return NextResponse.json(application);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating applicant', error: error.message }, { status: 500 });
  }
}

// DELETE applicant
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, RECRUITMENT_ROLES)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Applicant ID required' }, { status: 400 });
    }

    const application = await JobApplication.findOneAndDelete({ _id: id, companyId: auth.companyId });

    if (!application) {
      return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Applicant deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting applicant', error: error.message }, { status: 500 });
  }
}
