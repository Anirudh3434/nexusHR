import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SurveyResponse from '@/models/SurveyResponse';
import Survey from '@/models/Survey';
import { headers } from 'next/headers';

// Generate response number helper
async function generateResponseNumber(): Promise<string> {
  const date = new Date();
  const prefix = 'RSP';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  const count = await SurveyResponse.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), 1),
    },
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `${prefix}${year}${month}${sequence}`;
}

// GET - Fetch survey responses
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
    const surveyId = searchParams.get('surveyId');
    const urlCompanyId = searchParams.get('companyId');

    const query: any = {};

    // Role-based filtering
    if (userRole === 'employee') {
      query.employeeId = userId;
    } else if (urlCompanyId || companyId) {
      query.companyId = urlCompanyId || companyId;
    }

    if (surveyId) query.surveyId = surveyId;

    const responses = await SurveyResponse.find(query)
      .populate('surveyId', 'title type isAnonymous')
      .populate('employeeId', 'name email department')
      .sort({ createdAt: -1 });

    return NextResponse.json({ responses });
  } catch (error: any) {
    console.error('Error fetching survey responses:', error);
    return NextResponse.json({ message: 'Error fetching survey responses', error: error.message }, { status: 500 });
  }
}

// POST - Submit survey response
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { surveyId, answers, timeToComplete } = body;

    // Validation
    if (!surveyId || !answers || answers.length === 0) {
      return NextResponse.json({ 
        message: 'Missing required fields',
        required: ['surveyId', 'answers']
      }, { status: 400 });
    }

    // Find survey
    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 });
    }

    // Check if survey is active
    if (survey.status !== 'active') {
      return NextResponse.json({ 
        message: 'Survey is not active' 
      }, { status: 400 });
    }

    // Check if survey has expired
    if (survey.endDate && new Date() > new Date(survey.endDate)) {
      return NextResponse.json({ 
        message: 'Survey has expired' 
      }, { status: 400 });
    }

    // Check if user has already responded (if not anonymous and not multiple responses)
    if (!survey.isAnonymous && !survey.allowMultipleResponses) {
      const existingResponse = await SurveyResponse.findOne({
        surveyId,
        employeeId: userId,
      });
      
      if (existingResponse) {
        return NextResponse.json({ 
          message: 'You have already responded to this survey' 
        }, { status: 400 });
      }
    }

    // Get user info for non-anonymous surveys
    let employeeName = '';
    let department = '';
    if (!survey.isAnonymous) {
      const User = (await import('@/models/User')).default;
      const user = await User.findById(userId);
      if (user) {
        employeeName = user.name;
        department = user.department || '';
      }
    }

    const responseNumber = await generateResponseNumber();

    const response = await SurveyResponse.create({
      responseNumber,
      surveyId,
      companyId: survey.companyId,
      employeeId: survey.isAnonymous ? undefined : userId,
      employeeName: survey.isAnonymous ? 'Anonymous' : employeeName,
      department: survey.isAnonymous ? undefined : department,
      answers,
      submittedAt: new Date(),
      timeToComplete: timeToComplete || 0,
      ipAddress: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '',
    });

    // Update survey response count
    survey.totalResponses += 1;
    // Ensure totalSent is at least the number of responses received
    // (it starts at 0 and is only meaningful when surveys are explicitly "sent";
    // until a proper send mechanism is implemented, keep it >= totalResponses)
    if (survey.totalSent < survey.totalResponses) {
      survey.totalSent = survey.totalResponses;
    }
    survey.responseRate = survey.totalSent > 0
      ? (survey.totalResponses / survey.totalSent) * 100
      : 0;
    await survey.save();

    const populatedResponse = await SurveyResponse.findById(response._id)
      .populate('surveyId', 'title type isAnonymous');

    return NextResponse.json({ 
      message: 'Survey response submitted successfully',
      response: populatedResponse 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting survey response:', error);
    
    // Handle duplicate key error (unique constraint violation)
    if (error.code === 11000) {
      return NextResponse.json({ 
        message: 'You have already responded to this survey' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Error submitting survey response', error: error.message }, { status: 500 });
  }
}

// GET /survey-responses/[id] - Fetch single response
export async function getResponse(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const response = await SurveyResponse.findById(params.id)
      .populate('surveyId', 'title type isAnonymous companyId')
      .populate('employeeId', 'name email department');

    if (!response) {
      return NextResponse.json({ message: 'Response not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = response.employeeId?.toString() === userId;
    const canManage = ['admin', 'hr', 'manager'].includes(userRole);
    
    if (!isOwner && !canManage) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Error fetching response:', error);
    return NextResponse.json({ message: 'Error fetching response', error: error.message }, { status: 500 });
  }
}
