import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import connectDB from '@/lib/mongodb';
import JobApplication from '@/models/JobApplication';
import { grantPortalAccess, hireCandidate, notifyRejection } from '@/lib/hireService';

// GET applicants (all applications with Job ID - both website and email)
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const source = searchParams.get('source'); // Optional: filter by source
    const status = searchParams.get('status');
    const showGeneral = searchParams.get('showGeneral') === 'true';
    const jobId = searchParams.get('jobId');
    const query: any = { companyId };

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
    const { id, status, rejectionReason, joiningDate, ctc, position, department, employmentType } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ message: 'ID and status required' }, { status: 400 });
    }

    const update: any = { status };
    if (rejectionReason) {
      update.rejectionReason = rejectionReason;
    }

    const application = await JobApplication.findByIdAndUpdate(
      id,
      update,
      { new: true }
    );

    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const origin = req.headers.get('origin') || `http://${req.headers.get('host') || 'localhost:3000'}`;
    const actor = {
      _id: headersList.get('x-user-id') || '',
      name: headersList.get('x-user-name') || 'HR',
      email: headersList.get('x-user-email') || '',
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Applicant ID required' }, { status: 400 });
    }

    const application = await JobApplication.findByIdAndDelete(id);
    
    if (!application) {
      return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Applicant deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting applicant', error: error.message }, { status: 500 });
  }
}
