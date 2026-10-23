import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import connectDB from '@/lib/mongodb';
import JobApplication from '@/models/JobApplication';
import { grantPortalAccess, hireCandidate, notifyRejection } from '@/lib/hireService';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import '@/models/User'; // Import to register User model for populate

const RECRUITMENT_ROLES = ['admin', 'hr', 'manager'];

const STATUS_ENUM = ['new', 'under_review', 'considered', 'rejected', 'shortlisted', 'interview', 'hired', 'spam'];

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

// Fields the PATCH handler consumes — nothing else is writable.
const PATCH_ALLOWLIST = [
  'status', 'rejectionReason', 'joiningDate', 'ctc', 'position',
  'department', 'employmentType', 'assignedTo', 'isRead', 'isStarred',
  'rating', 'hrNotes', 'labels',
];

// Fields a client may supply when manually creating an application.
const CREATE_ALLOWLIST = [
  'fromEmail', 'fromName', 'subject', 'body', 'bodyText', 'jobPositionId',
  'jobId', 'candidateName', 'candidatePhone', 'appliedPosition', 'experience',
  'currentDesignation', 'skills', 'expectedSalary', 'noticePeriod',
  'emailMessageId', 'threadId', 'source',
];

function rejectDollarKeys(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  return Object.keys(obj).some((k) => k.startsWith('$') || k.includes('.'));
}

// GET job applications
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
    const status = searchParams.get('status');
    const isRead = searchParams.get('isRead');
    const isStarred = searchParams.get('isStarred');
    const email = searchParams.get('email');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const companyId = auth.companyId;

    const query: any = { companyId };
    if (status) query.status = status;
    if (isRead !== null) query.isRead = isRead === 'true';
    if (isStarred !== null) query.isStarred = isStarred === 'true';
    if (email) query.fromEmail = email.toLowerCase();

    const [applications, total] = await Promise.all([
      JobApplication.find(query)
        .sort({ receivedAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('assignedTo', 'name email')
        .lean(),
      JobApplication.countDocuments(query)
    ]);

    // Get stats
    const stats = await JobApplication.aggregate([
      { $match: { companyId: new (await import('mongoose')).default.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
          starred: { $sum: { $cond: [{ $eq: ['$isStarred', true] }, 1, 0] } },
          shortlisted: { $sum: { $cond: [{ $eq: ['$status', 'shortlisted'] }, 1, 0] } },
        }
      }
    ]);

    return NextResponse.json({
      applications,
      total,
      offset,
      limit,
      stats: stats[0] || { total: 0, new: 0, unread: 0, starred: 0, shortlisted: 0 }
    });
  } catch (error: any) {
    console.error('Job applications error:', error);
    return NextResponse.json({ message: 'Error fetching applications', error: error.message }, { status: 500 });
  }
}

// POST manually create application (or sync from email)
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, RECRUITMENT_ROLES)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const data = await req.json();

    if (data.companyId && data.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    if (rejectDollarKeys(data)) {
      return NextResponse.json({ message: 'Invalid field names' }, { status: 400 });
    }

    // Explicit allowlist — companyId always comes from the session.
    const createData: any = { companyId: auth.companyId };
    for (const key of CREATE_ALLOWLIST) {
      if (data[key] !== undefined) createData[key] = data[key];
    }

    if (!createData.fromEmail) {
      return NextResponse.json({ message: 'Company ID and from email required' }, { status: 400 });
    }

    // Check for duplicate by message ID (for email applications)
    if (createData.emailMessageId) {
      const existing = await JobApplication.findOne({ emailMessageId: createData.emailMessageId });
      if (existing) {
        return NextResponse.json({ message: 'Application already exists', application: existing });
      }
    }

    // VALIDATION: Check for duplicate - Same email + Same jobId = reject
    // Same email + Different jobId = allowed
    if (createData.jobId && createData.fromEmail) {
      const existingByEmailAndJob = await JobApplication.findOne({
        fromEmail: createData.fromEmail.toLowerCase(),
        jobId: createData.jobId,
        companyId: auth.companyId
      });

      if (existingByEmailAndJob) {
        return NextResponse.json({
          message: 'You have already applied for this position',
          error: 'DUPLICATE_APPLICATION',
          application: existingByEmailAndJob
        }, { status: 409 });
      }
    }

    // Normalize email to lowercase before saving
    if (createData.fromEmail) {
      createData.fromEmail = createData.fromEmail.toLowerCase();
    }

    const application = await JobApplication.create(createData);
    return NextResponse.json(application, { status: 201 });
  } catch (error: any) {
    // Handle duplicate key error (MongoDB error code 11000)
    if (error.code === 11000 && error.message.includes('unique_email_jobId')) {
      return NextResponse.json({
        message: 'You have already applied for this position',
        error: 'DUPLICATE_APPLICATION'
      }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error creating application', error: error.message }, { status: 500 });
  }
}

// PATCH update application
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
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ message: 'Application ID required' }, { status: 400 });
    }

    if (rejectDollarKeys(rest)) {
      return NextResponse.json({ message: 'Invalid field names' }, { status: 400 });
    }

    // Explicit allowlist of the fields this handler consumes.
    const updateData: any = {};
    for (const key of PATCH_ALLOWLIST) {
      if (rest[key] !== undefined) updateData[key] = rest[key];
    }

    // Scoped lookup first (tenant isolation + transition validation)
    const existing = await JobApplication.findOne({ _id: id, companyId: auth.companyId });
    if (!existing) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    if (updateData.status !== undefined) {
      if (!STATUS_ENUM.includes(updateData.status)) {
        return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
      }
      if (updateData.status !== existing.status) {
        const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
        if (!allowed.includes(updateData.status)) {
          return NextResponse.json({
            message: `Status transition from "${existing.status}" to "${updateData.status}" is not allowed`,
            error: 'TRANSITION_NOT_ALLOWED',
          }, { status: 400 });
        }
      }
    }

    const application = await JobApplication.findOneAndUpdate(
      { _id: id, companyId: auth.companyId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).populate('assignedTo', 'name email');

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

    // Auto-grant portal access on consider/shortlist so the candidate can track the pipeline
    if (['considered', 'shortlisted'].includes(updateData.status) && companyId) {
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
        });
      }
    }

    // Auto-hire: when an applicant is marked hired, create the portal account +
    // onboarding and email their credentials immediately.
    if (updateData.status === 'hired' && companyId) {
      try {
        const hireResult = await hireCandidate({
          companyId,
          actor,
          applicationId: id,
          joiningDate: updateData.joiningDate,
          ctc: updateData.ctc,
          position: updateData.position,
          department: updateData.department,
          employmentType: updateData.employmentType,
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
          ...application.toObject(),
          message: 'Application marked as hired, but the portal access setup failed',
          error: error.message,
        });
      }
    }

    // Auto-notify: when an applicant is rejected, email them the decision.
    if (updateData.status === 'rejected' && companyId) {
      try {
        await notifyRejection({
          companyId,
          applicationId: id,
          origin,
          reason: updateData.rejectionReason || '',
        });
      } catch (error: any) {
        console.error('Rejection email failed:', error);
      }
    }

    return NextResponse.json(application);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating application', error: error.message }, { status: 500 });
  }
}

// DELETE application
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
      return NextResponse.json({ message: 'Application ID required' }, { status: 400 });
    }

    const application = await JobApplication.findOneAndDelete({ _id: id, companyId: auth.companyId });
    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Application deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting application', error: error.message }, { status: 500 });
  }
}
