import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Onboarding from '@/models/Onboarding';
import User from '@/models/User';
import Company from '@/models/Company';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import {
  buildChecklistFromTemplate,
  buildDocumentsFromTemplate,
  generateOfferLetterHTML,
} from '@/lib/onboardingTemplates';

// GET - List onboarding records (role-scoped)
export async function GET(req: Request) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const query: any = {};

    if (userRole === 'employee') {
      query.employeeId = userId;
    } else if (companyId) {
      query.companyId = companyId;
    }

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { 'candidate.fullName': { $regex: search, $options: 'i' } },
        { 'candidate.email': { $regex: search, $options: 'i' } },
        { 'candidate.position': { $regex: search, $options: 'i' } },
        { 'candidate.department': { $regex: search, $options: 'i' } },
      ];
    }

    const records = await Onboarding.find(query)
      .populate('employeeId', 'name email role isActive')
      .sort({ createdAt: -1 });

    return NextResponse.json({ onboarding: records });
  } catch (error: any) {
    console.error('Error fetching onboarding:', error);
    return NextResponse.json({ message: 'Error fetching onboarding', error: error.message }, { status: 500 });
  }
}

// POST - Create onboarding record for a new hire
export async function POST(req: Request) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name') || '';
    const userRole = headersList.get('x-user-role') || 'employee';
    const userEmail = headersList.get('x-user-email') || '';
    const companyId = headersList.get('x-company-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!['super_admin', 'admin', 'hr'].includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const {
      fullName,
      email,
      password,
      phone,
      position,
      department,
      reportingManager,
      employmentType,
      joiningDate,
      workLocation,
      source,
      ctc,
      probationMonths,
      includeTemplates,
      notes,
    } = body;

    if (!fullName || !email || !joiningDate) {
      return NextResponse.json({
        message: 'Missing required fields',
        required: ['fullName', 'email', 'joiningDate'],
      }, { status: 400 });
    }

    // Validate joining date is a valid date
    const joinDate = new Date(joiningDate);
    if (isNaN(joinDate.getTime())) {
      return NextResponse.json({ message: 'Invalid joining date' }, { status: 400 });
    }

    const createdBy = { _id: userId, name: userName, email: userEmail || '' };

    // Check for an existing active onboarding for the same email in this company
    const existing = await Onboarding.findOne({
      companyId,
      'candidate.email': email.toLowerCase(),
      status: { $nin: ['cancelled', 'offer_declined'] },
    });
    if (existing) {
      return NextResponse.json({
        message: 'An active onboarding record already exists for this email',
        id: existing._id,
      }, { status: 409 });
    }

    // Link or create the user account so the new hire can log in for self-service
    let employeeUser = await User.findOne({ email: email.toLowerCase() }).select('-password');
    let accountCreated = false;
    if (!employeeUser) {
      if (!password || password.length < 6) {
        return NextResponse.json({
          message: 'Password is required (min 6 characters) to create the employee account',
        }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        name: fullName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'employee',
        companyId,
        department: department || undefined,
        designation: position || undefined,
        joiningDate: joinDate,
        isActive: true,
      });
      employeeUser = newUser;
      accountCreated = true;
    }

    // Build checklist & documents from templates
    const checklist = includeTemplates !== false ? buildChecklistFromTemplate(joinDate) : [];
    const documents = includeTemplates !== false ? buildDocumentsFromTemplate() : [];

    const onboardingData: any = {
      companyId,
      employeeId: employeeUser._id,
      candidate: {
        fullName,
        email: email.toLowerCase(),
        phone: phone || '',
        position: position || '',
        department: department || '',
        reportingManager: reportingManager || '',
        employmentType: employmentType || 'Full-time',
        joiningDate: joinDate,
        workLocation: workLocation || '',
        source: source || 'manual',
      },
      offerLetter: {
        status: 'draft',
        ctc: ctc || '',
        probationMonths: Number(probationMonths) || 3,
      },
      documents,
      checklist,
      notes: notes || '',
      createdBy,
      lastUpdatedBy: createdBy,
      activity: [{ userId, userName: userName || 'Admin', action: 'created', details: 'Onboarding record created' }],
    };

    const record = await Onboarding.create(onboardingData);

    // Auto-generate a draft offer letter when CTC is provided
    if (ctc) {
      const company = await Company.findById(companyId);
      const html = generateOfferLetterHTML(record.candidate, record.offerLetter, company);
      record.offerLetter.content = html;
      record.offerLetter.generatedBy = createdBy;
      record.offerLetter.generatedAt = new Date();
      await record.save();
    }

    return NextResponse.json({
      message: 'Onboarding created successfully',
      onboarding: record,
      accountCreated,
      employeeId: employeeUser._id,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating onboarding:', error);
    return NextResponse.json({ message: 'Error creating onboarding', error: error.message }, { status: 500 });
  }
}
