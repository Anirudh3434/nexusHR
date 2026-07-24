import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Survey from '@/models/Survey';
import { headers } from 'next/headers';

// Generate survey number helper
async function generateSurveyNumber(): Promise<string> {
  const date = new Date();
  const prefix = 'SVY';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  const count = await Survey.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), 1),
    },
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `${prefix}${year}${month}${sequence}`;
}

// GET - Fetch surveys
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
    const urlCompanyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly');

    const query: any = {};

    // Role-based filtering
    if (userRole === 'employee') {
      query.companyId = companyId;
      query.status = 'active';
      
      // For employees, apply targeting logic
      // Get employee info to check department
      const User = (await import('@/models/User')).default;
      const employee = await User.findById(userId);
      
      if (employee) {
        // Survey is visible if:
        // 1. No targeting set (both arrays empty or undefined)
        // 2. Employee's department is in targetDepartments
        // 3. Employee's ID is in targetEmployees
        query.$or = [
          // No targeting - show to all
          {
            $or: [
              { targetDepartments: { $exists: false } },
              { targetDepartments: { $size: 0 } },
              { targetEmployees: { $exists: false } },
              { targetEmployees: { $size: 0 } }
            ]
          },
          // Department match
          { targetDepartments: { $in: [employee.department || ''] } },
          // Direct employee targeting
          { targetEmployees: { $in: [userId] } }
        ];
      }
    } else if (urlCompanyId || companyId) {
      query.companyId = urlCompanyId || companyId;
    }

    if (status) query.status = status;
    if (type) query.type = type;
    if (activeOnly === 'true') query.status = 'active';

    const surveys = await Survey.find(query)
      .populate('createdBy', 'name email')
      .populate('targetEmployees', 'name email department')
      .sort({ createdAt: -1 });

    return NextResponse.json({ surveys });
  } catch (error: any) {
    console.error('Error fetching surveys:', error);
    return NextResponse.json({ message: 'Error fetching surveys', error: error.message }, { status: 500 });
  }
}

// POST - Create new survey
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Only admin/HR can create surveys
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await req.json();
    const { 
      title, 
      description, 
      type, 
      questions, 
      targetDepartments, 
      targetEmployees,
      isAnonymous,
      startDate,
      endDate,
      allowMultipleResponses,
      showResultsToEmployees 
    } = body;

    // Validation
    if (!title || !questions || questions.length === 0) {
      return NextResponse.json({ 
        message: 'Missing required fields',
        required: ['title', 'questions']
      }, { status: 400 });
    }

    const surveyNumber = await generateSurveyNumber();

    const survey = await Survey.create({
      surveyNumber,
      title,
      description: description || '',
      type: type || 'custom',
      status: 'draft',
      questions,
      companyId: companyId || body.companyId,
      targetDepartments: targetDepartments || [],
      targetEmployees: targetEmployees || [],
      isAnonymous: isAnonymous || false,
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: userId,
      totalSent: 0,
      totalResponses: 0,
      responseRate: 0,
      allowMultipleResponses: allowMultipleResponses || false,
      showResultsToEmployees: showResultsToEmployees || false,
    });

    const populatedSurvey = await Survey.findById(survey._id)
      .populate('createdBy', 'name email')
      .populate('targetEmployees', 'name email department');

    return NextResponse.json({ 
      message: 'Survey created successfully',
      survey: populatedSurvey 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating survey:', error);
    return NextResponse.json({ message: 'Error creating survey', error: error.message }, { status: 500 });
  }
}

// PATCH - Update survey
export async function PATCH(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { 
      id, 
      status, 
      title, 
      description, 
      questions, 
      targetDepartments, 
      targetEmployees,
      isAnonymous,
      startDate,
      endDate,
      allowMultipleResponses,
      showResultsToEmployees 
    } = body;

    if (!id) {
      return NextResponse.json({ message: 'Survey ID is required' }, { status: 400 });
    }

    // Find survey
    const survey = await Survey.findById(id);
    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 });
    }

    // Check permissions
    const canManage = ['admin', 'hr', 'manager'].includes(userRole);
    
    if (!canManage) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const updateData: any = {};
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (questions) updateData.questions = questions;
    if (targetDepartments !== undefined) updateData.targetDepartments = targetDepartments;
    if (targetEmployees !== undefined) updateData.targetEmployees = targetEmployees;
    if (isAnonymous !== undefined) updateData.isAnonymous = isAnonymous;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (allowMultipleResponses !== undefined) updateData.allowMultipleResponses = allowMultipleResponses;
    if (showResultsToEmployees !== undefined) updateData.showResultsToEmployees = showResultsToEmployees;
    
    // Status updates with validation
    if (status) {
      if (status === 'active' && (!survey.questions || survey.questions.length === 0)) {
        return NextResponse.json({ 
          message: 'Cannot activate survey without questions' 
        }, { status: 400 });
      }
      updateData.status = status;
    }

    const updatedSurvey = await Survey.findByIdAndUpdate(id, updateData, { new: true })
      .populate('createdBy', 'name email')
      .populate('targetEmployees', 'name email department');

    return NextResponse.json({ 
      message: 'Survey updated successfully',
      survey: updatedSurvey 
    });
  } catch (error: any) {
    console.error('Error updating survey:', error);
    return NextResponse.json({ message: 'Error updating survey', error: error.message }, { status: 500 });
  }
}

// DELETE - Delete survey
export async function DELETE(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Survey ID is required' }, { status: 400 });
    }

    const survey = await Survey.findById(id);
    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 });
    }

    // Only admin/HR can delete
    const canManage = ['admin', 'hr'].includes(userRole);
    
    if (!canManage) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    // Can only delete if not active
    if (survey.status === 'active') {
      return NextResponse.json({ 
        message: 'Cannot delete active survey. Close it first.' 
      }, { status: 400 });
    }

    await Survey.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Survey deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting survey:', error);
    return NextResponse.json({ message: 'Error deleting survey', error: error.message }, { status: 500 });
  }
}
