import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Termination from '@/models/Termination';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

// Generate termination number helper
async function generateTerminationNumber(): Promise<string> {
  const date = new Date();
  const prefix = 'TRM';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  const count = await Termination.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), 1),
    },
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `${prefix}${year}${month}${sequence}`;
}

// GET - Fetch terminations
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
    const employeeId = searchParams.get('employeeId');
    const pendingApprovals = searchParams.get('pendingApprovals');

    const query: any = {};

    // Role-based filtering
    if (userRole === 'employee') {
      // Employees can see their own termination (if any)
      query.employeeId = userId;
    } else if (urlCompanyId || companyId) {
      query.companyId = urlCompanyId || companyId;
    }

    // HR can see all in company
    // Managers can see pending for approval + all in company
    if (pendingApprovals === 'true' && ['admin', 'manager'].includes(userRole)) {
      query.status = { $in: ['pending', 'under_review'] };
      // If manager, could filter by their team in future
    }

    if (status) query.status = status;
    if (employeeId) query.employeeId = employeeId;

    const terminations = await Termination.find(query)
      .populate('employeeId', 'firstName lastName email employeeId department designation')
      .populate('initiatedBy', 'name email')
      .populate('approverId', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ terminations });
  } catch (error: any) {
    console.error('Error fetching terminations:', error);
    return NextResponse.json({ message: 'Error fetching terminations', error: error.message }, { status: 500 });
  }
}

// POST - Create new termination (HR only)
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Only HR, Admin, or Manager can initiate termination
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await req.json();
    const { 
      employeeId, 
      approverId,
      type, 
      reason, 
      detailedReason, 
      terminationDate, 
      noticeDate,
      noticePeriodDays,
      severanceAmount,
      documents 
    } = body;

    // Validation
    if (!employeeId || !reason || !terminationDate) {
      return NextResponse.json({ 
        message: 'Missing required fields',
        required: ['employeeId', 'reason', 'terminationDate']
      }, { status: 400 });
    }

    // Check for existing active termination
    const existingTermination = await Termination.findOne({
      employeeId,
      status: { $in: ['pending', 'under_review', 'approved'] }
    });

    if (existingTermination) {
      return NextResponse.json({ 
        message: 'An active termination request already exists for this employee',
        existingTermination: {
          id: existingTermination._id,
          status: existingTermination.status,
          terminationNumber: existingTermination.terminationNumber
        }
      }, { status: 409 });
    }

    const terminationNumber = await generateTerminationNumber();

    const termination = await Termination.create({
      terminationNumber,
      employeeId,
      companyId: companyId || body.companyId,
      initiatedBy: userId,
      approverId: approverId || null,
      type: type || 'involuntary',
      reason,
      detailedReason,
      noticeDate: noticeDate ? new Date(noticeDate) : new Date(),
      terminationDate: new Date(terminationDate),
      noticePeriodDays: noticePeriodDays || 30,
      status: 'pending',
      severanceAmount,
      documents: documents || [],
      clearanceStatus: 'pending',
      comments: [],
    });

    const populatedTermination = await Termination.findById(termination._id)
      .populate('employeeId', 'firstName lastName email employeeId department designation')
      .populate('initiatedBy', 'name email')
      .populate('approverId', 'name email');

    return NextResponse.json({ 
      message: 'Termination initiated successfully',
      termination: populatedTermination 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating termination:', error);
    return NextResponse.json({ message: 'Error creating termination', error: error.message }, { status: 500 });
  }
}

// PATCH - Update termination (approve/reject/update)
export async function PATCH(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const userName = headersList.get('x-user-name') || 'Unknown';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { 
      id, 
      status, 
      rejectionReason,
      approverId,
      exitInterviewCompleted,
      exitInterviewNotes,
      assetsReturned,
      assetsReturnedNotes,
      clearanceStatus,
      settlementNotes,
      comment 
    } = body;

    if (!id) {
      return NextResponse.json({ message: 'Termination ID is required' }, { status: 400 });
    }

    const termination = await Termination.findById(id);
    if (!termination) {
      return NextResponse.json({ message: 'Termination not found' }, { status: 404 });
    }

    const isInitiator = termination.initiatedBy.toString() === userId;
    const isApprover = termination.approverId?.toString() === userId || ['admin', 'manager'].includes(userRole);
    const canManage = ['admin', 'hr', 'manager'].includes(userRole);

    const updateData: any = {};
    
    // Approval/Rejection - only by approver or admin/manager
    if (status && (isApprover || ['admin', 'manager'].includes(userRole))) {
      if (!['pending', 'under_review'].includes(termination.status)) {
        return NextResponse.json({ message: 'Cannot change status of processed termination' }, { status: 400 });
      }
      
      updateData.status = status;
      
      if (status === 'approved') {
        updateData.approvedBy = userId;
        updateData.approvedAt = new Date();
      }
      
      if (status === 'rejected') {
        if (!rejectionReason) {
          return NextResponse.json({ message: 'Rejection reason is required' }, { status: 400 });
        }
        updateData.rejectionReason = rejectionReason;
      }
    }
    
    // Assign approver
    if (approverId && canManage) {
      updateData.approverId = approverId;
    }
    
    // Exit formalities updates - by initiator or admin
    if (canManage || isInitiator) {
      if (exitInterviewCompleted !== undefined) updateData.exitInterviewCompleted = exitInterviewCompleted;
      if (exitInterviewNotes !== undefined) updateData.exitInterviewNotes = exitInterviewNotes;
      if (assetsReturned !== undefined) updateData.assetsReturned = assetsReturned;
      if (assetsReturnedNotes !== undefined) updateData.assetsReturnedNotes = assetsReturnedNotes;
      if (clearanceStatus !== undefined) updateData.clearanceStatus = clearanceStatus;
      if (settlementNotes !== undefined) updateData.settlementNotes = settlementNotes;
    }

    // Add comment
    if (comment) {
      const newComment = {
        author: new mongoose.Types.ObjectId(userId),
        authorName: userName,
        role: userRole,
        message: comment,
        createdAt: new Date(),
        internal: true,
      };
      
      await Termination.findByIdAndUpdate(id, {
        $push: { comments: newComment }
      });
    }

    const updatedTermination = await Termination.findByIdAndUpdate(id, updateData, { new: true })
      .populate('employeeId', 'firstName lastName email employeeId department designation')
      .populate('initiatedBy', 'name email')
      .populate('approverId', 'name email')
      .populate('approvedBy', 'name email');

    return NextResponse.json({ 
      message: 'Termination updated successfully',
      termination: updatedTermination 
    });
  } catch (error: any) {
    console.error('Error updating termination:', error);
    return NextResponse.json({ message: 'Error updating termination', error: error.message }, { status: 500 });
  }
}

// DELETE - Cancel termination
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
      return NextResponse.json({ message: 'Termination ID is required' }, { status: 400 });
    }

    const termination = await Termination.findById(id);
    if (!termination) {
      return NextResponse.json({ message: 'Termination not found' }, { status: 404 });
    }

    const isInitiator = termination.initiatedBy.toString() === userId;
    const isAdmin = userRole === 'admin';
    
    if (!isInitiator && !isAdmin) {
      return NextResponse.json({ message: 'You can only cancel terminations you initiated' }, { status: 403 });
    }

    if (termination.status === 'completed') {
      return NextResponse.json({ message: 'Cannot cancel completed termination' }, { status: 400 });
    }

    await Termination.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Termination cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling termination:', error);
    return NextResponse.json({ message: 'Error cancelling termination', error: error.message }, { status: 500 });
  }
}
