import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Termination from '@/models/Termination';
import { headers } from 'next/headers';
import mongoose from 'mongoose';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const APPROVER_ROLES = ['admin', 'hr', 'manager'];
const PENDING_STATUSES = ['pending', 'under_review'];

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

    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId && auth.role !== 'employee') {
      return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    }

    const userId = auth.userId;
    const userRole = auth.role || 'employee';
    const companyId = auth.companyId;

    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    if (queryCompanyId && queryCompanyId !== companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const pendingApprovals = searchParams.get('pendingApprovals');

    const query: any = {};

    // Role-based filtering — company always from the session.
    if (userRole === 'employee') {
      // Employees can see their own termination (if any)
      query.employeeId = userId;
      if (companyId) query.companyId = companyId;
    } else {
      if (!companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
      query.companyId = companyId;
    }

    // HR can see all in company
    // Managers can see pending for approval + all in company
    if (pendingApprovals === 'true' && ['admin', 'hr', 'manager'].includes(userRole)) {
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

    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const userId = auth.userId;
    const userRole = auth.role || 'employee';
    const companyId = auth.companyId;

    // Only HR, Admin, or Manager can initiate termination
    if (!hasRole(userRole, APPROVER_ROLES)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    if (!companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const body = await req.json();

    if (body.companyId && body.companyId !== companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

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

    // Check for existing active termination (scoped to session company)
    const existingTermination = await Termination.findOne({
      employeeId,
      companyId,
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
      companyId,
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

    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const userId = auth.userId;
    const userRole = auth.role || 'employee';
    const companyId = auth.companyId;
    const headersList = await headers();
    const userName = headersList.get('x-user-name') || 'Unknown';

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

    // Scoped lookup first for permission checks.
    const termination = await Termination.findOne({ _id: id, companyId });
    if (!termination) {
      return NextResponse.json({ message: 'Termination not found' }, { status: 404 });
    }

    const isInitiator = termination.initiatedBy.toString() === userId;
    const isApprover = termination.approverId?.toString() === userId || hasRole(userRole, APPROVER_ROLES);
    const canManage = hasRole(userRole, APPROVER_ROLES);

    // Approval/Rejection - only by approver or admin/hr/manager.
    // Atomic: only a pending record can transition; concurrent approvers get 409.
    if (status) {
      if (!isApprover) {
        return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      }
      if (!PENDING_STATUSES.includes(termination.status)) {
        return NextResponse.json({ message: 'Cannot change status of processed termination' }, { status: 400 });
      }
      if (status === 'rejected' && !rejectionReason) {
        return NextResponse.json({ message: 'Rejection reason is required' }, { status: 400 });
      }

      const statusUpdate: any = { status };
      if (status === 'approved') {
        statusUpdate.approvedBy = userId;
        statusUpdate.approvedAt = new Date();
      }
      if (status === 'rejected') {
        statusUpdate.rejectionReason = rejectionReason;
      }

      const claimed = await Termination.findOneAndUpdate(
        { _id: id, companyId, status: { $in: PENDING_STATUSES } },
        { $set: statusUpdate },
        { new: true }
      );
      if (!claimed) {
        return NextResponse.json({ message: 'Termination was already processed by another approver' }, { status: 409 });
      }
    }

    // Assign approver
    if (approverId && canManage) {
      await Termination.findOneAndUpdate({ _id: id, companyId }, { $set: { approverId } });
    }

    // Exit formalities updates - by initiator or approver-role
    const formalities: any = {};
    if (canManage || isInitiator) {
      if (exitInterviewCompleted !== undefined) formalities.exitInterviewCompleted = exitInterviewCompleted;
      if (exitInterviewNotes !== undefined) formalities.exitInterviewNotes = exitInterviewNotes;
      if (assetsReturned !== undefined) formalities.assetsReturned = assetsReturned;
      if (assetsReturnedNotes !== undefined) formalities.assetsReturnedNotes = assetsReturnedNotes;
      if (clearanceStatus !== undefined) formalities.clearanceStatus = clearanceStatus;
      if (settlementNotes !== undefined) formalities.settlementNotes = settlementNotes;
    }
    if (Object.keys(formalities).length > 0) {
      await Termination.findOneAndUpdate({ _id: id, companyId }, { $set: formalities });
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

      await Termination.findOneAndUpdate({ _id: id, companyId }, {
        $push: { comments: newComment }
      });
    }

    const updatedTermination = await Termination.findOne({ _id: id, companyId })
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

    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const userId = auth.userId;
    const userRole = auth.role || 'employee';
    const companyId = auth.companyId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Termination ID is required' }, { status: 400 });
    }

    const termination = await Termination.findOne({ _id: id, companyId });
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

    await Termination.findOneAndDelete({ _id: id, companyId });

    return NextResponse.json({ message: 'Termination cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling termination:', error);
    return NextResponse.json({ message: 'Error cancelling termination', error: error.message }, { status: 500 });
  }
}
