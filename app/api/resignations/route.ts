import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Resignation from '@/models/Resignation';
import { headers } from 'next/headers';

// GET - Fetch resignations
export async function GET(req: Request) {
  try {
    await connectDB();
    
    // Get user info from headers (set by middleware)
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const urlCompanyId = searchParams.get('companyId');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const myResignation = searchParams.get('myResignation');

    const query: any = {};

    // Role-based filtering
    if (userRole === 'employee') {
      // Employees can only see their own resignation
      query.submittedBy = userId;
    } else if (urlCompanyId || companyId) {
      query.companyId = urlCompanyId || companyId;
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (status) {
      query.status = status;
    }

    if (myResignation === 'true') {
      query.submittedBy = userId;
    }

    const resignations = await Resignation.find(query)
      .populate('employeeId', 'firstName lastName email employeeId department designation')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ resignations });
  } catch (error: any) {
    console.error('Error fetching resignations:', error);
    return NextResponse.json({ message: 'Error fetching resignations', error: error.message }, { status: 500 });
  }
}

// POST - Submit new resignation
export async function POST(req: Request) {
  try {
    await connectDB();
    
    // Get user info from headers (set by middleware)
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { employeeId, companyId, lastWorkingDate, reason, detailedReason, noticePeriodDays } = body;

    // Validation
    if (!employeeId || !companyId || !lastWorkingDate || !reason || !noticePeriodDays) {
      return NextResponse.json({ 
        message: 'Missing required fields',
        required: ['employeeId', 'companyId', 'lastWorkingDate', 'reason', 'noticePeriodDays']
      }, { status: 400 });
    }

    // Check if employee already has an active resignation
    const existingResignation = await Resignation.findOne({
      employeeId,
      status: { $in: ['pending', 'under_review', 'approved'] }
    });

    if (existingResignation) {
      return NextResponse.json({ 
        message: 'You already have an active resignation request',
        existingResignation: {
          id: existingResignation._id,
          status: existingResignation.status,
          submittedAt: existingResignation.createdAt
        }
      }, { status: 409 });
    }

    // Validate last working date is in the future
    const lwd = new Date(lastWorkingDate);
    if (lwd < new Date()) {
      return NextResponse.json({ message: 'Last working date must be in the future' }, { status: 400 });
    }

    const resignation = await Resignation.create({
      employeeId,
      companyId,
      submittedBy: userId,
      resignationDate: new Date(),
      lastWorkingDate: lwd,
      reason,
      detailedReason,
      noticePeriodDays,
      status: 'pending',
      clearanceStatus: 'pending',
    });

    const populatedResignation = await Resignation.findById(resignation._id)
      .populate('employeeId', 'firstName lastName email employeeId department designation')
      .populate('submittedBy', 'name email');

    return NextResponse.json({ 
      message: 'Resignation submitted successfully',
      resignation: populatedResignation 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting resignation:', error);
    return NextResponse.json({ message: 'Error submitting resignation', error: error.message }, { status: 500 });
  }
}

// PATCH - Update resignation status
export async function PATCH(req: Request) {
  try {
    await connectDB();
    
    // Get user info from headers (set by middleware)
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Only HR and Admin can update resignation status
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    const body = await req.json();
    const { id, status, hrRemarks, exitInterviewCompleted, exitInterviewNotes, assetsReturned, assetsReturnedNotes, clearanceStatus } = body;

    if (!id) {
      return NextResponse.json({ message: 'Resignation ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
      if (status === 'approved') {
        updateData.approvedBy = userId;
        updateData.approvedAt = new Date();
      }
    }
    
    if (hrRemarks !== undefined) updateData.hrRemarks = hrRemarks;
    if (exitInterviewCompleted !== undefined) updateData.exitInterviewCompleted = exitInterviewCompleted;
    if (exitInterviewNotes !== undefined) updateData.exitInterviewNotes = exitInterviewNotes;
    if (assetsReturned !== undefined) updateData.assetsReturned = assetsReturned;
    if (assetsReturnedNotes !== undefined) updateData.assetsReturnedNotes = assetsReturnedNotes;
    if (clearanceStatus !== undefined) updateData.clearanceStatus = clearanceStatus;

    const resignation = await Resignation.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('employeeId', 'firstName lastName email employeeId department designation')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!resignation) {
      return NextResponse.json({ message: 'Resignation not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Resignation updated successfully',
      resignation 
    });
  } catch (error: any) {
    console.error('Error updating resignation:', error);
    return NextResponse.json({ message: 'Error updating resignation', error: error.message }, { status: 500 });
  }
}

// DELETE - Withdraw resignation (only by employee who submitted it)
export async function DELETE(req: Request) {
  try {
    await connectDB();
    
    // Get user info from headers (set by middleware)
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Resignation ID is required' }, { status: 400 });
    }

    const resignation = await Resignation.findById(id);

    if (!resignation) {
      return NextResponse.json({ message: 'Resignation not found' }, { status: 404 });
    }

    // Only the submitter or admin can withdraw/delete
    if (resignation.submittedBy.toString() !== userId && !['admin', 'hr'].includes(userRole)) {
      return NextResponse.json({ message: 'You can only withdraw your own resignation' }, { status: 403 });
    }

    // Can only withdraw if not already approved or rejected
    if (['approved', 'rejected'].includes(resignation.status)) {
      return NextResponse.json({ 
        message: `Cannot withdraw resignation with status: ${resignation.status}` 
      }, { status: 400 });
    }

    // Soft delete by marking as withdrawn
    resignation.status = 'withdrawn';
    await resignation.save();

    return NextResponse.json({ message: 'Resignation withdrawn successfully' });
  } catch (error: any) {
    console.error('Error withdrawing resignation:', error);
    return NextResponse.json({ message: 'Error withdrawing resignation', error: error.message }, { status: 500 });
  }
}
