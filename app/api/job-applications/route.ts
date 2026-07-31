import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import connectDB from '@/lib/mongodb';
import JobApplication from '@/models/JobApplication';
import { grantPortalAccess, hireCandidate } from '@/lib/hireService';
import '@/models/User'; // Import to register User model for populate

// GET job applications
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const isRead = searchParams.get('isRead');
    const isStarred = searchParams.get('isStarred');
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    let query: any = { companyId };
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
    const data = await req.json();

    if (!data.companyId || !data.fromEmail) {
      return NextResponse.json({ message: 'Company ID and from email required' }, { status: 400 });
    }

    // Check for duplicate by message ID (for email applications)
    if (data.emailMessageId) {
      const existing = await JobApplication.findOne({ emailMessageId: data.emailMessageId });
      if (existing) {
        return NextResponse.json({ message: 'Application already exists', application: existing });
      }
    }

    // VALIDATION: Check for duplicate - Same email + Same jobId = reject
    // Same email + Different jobId = allowed
    if (data.jobId && data.fromEmail) {
      const existingByEmailAndJob = await JobApplication.findOne({
        fromEmail: data.fromEmail.toLowerCase(),
        jobId: data.jobId,
        companyId: data.companyId
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
    if (data.fromEmail) {
      data.fromEmail = data.fromEmail.toLowerCase();
    }

    const application = await JobApplication.create(data);
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
    const { id, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json({ message: 'Application ID required' }, { status: 400 });
    }

    const application = await JobApplication.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).populate('assignedTo', 'name email');

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

    return NextResponse.json(application);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating application', error: error.message }, { status: 500 });
  }
}

// DELETE application
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Application ID required' }, { status: 400 });
    }

    const application = await JobApplication.findByIdAndDelete(id);
    if (!application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Application deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting application', error: error.message }, { status: 500 });
  }
}
