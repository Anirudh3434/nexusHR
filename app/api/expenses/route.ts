import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/models/Expense';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

// Generate expense number helper
async function generateExpenseNumber(): Promise<string> {
  const date = new Date();
  const prefix = 'EXP';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  const count = await Expense.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), 1),
    },
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `${prefix}${year}${month}${sequence}`;
}

// GET - Fetch expenses
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
    const category = searchParams.get('category');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const query: any = {};

    // Role-based filtering
    if (userRole === 'employee') {
      query.employeeId = userId;
    } else if (urlCompanyId || companyId) {
      query.companyId = urlCompanyId || companyId;
    }

    if (status) query.status = status;
    if (employeeId) query.employeeId = employeeId;
    if (category) query.category = category;
    
    // Date range filter
    if (fromDate || toDate) {
      query.expenseDate = {};
      if (fromDate) query.expenseDate.$gte = new Date(fromDate);
      if (toDate) query.expenseDate.$lte = new Date(toDate);
    }

    const expenses = await Expense.find(query)
      .populate('employeeId', 'name email department designation')
      .populate('approverId', 'name email')
      .populate('approvedBy', 'name email')
      .populate('reimbursedBy', 'name email')
      .sort({ createdAt: -1 });

    // Calculate stats
    const stats = {
      totalAmount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      pendingAmount: expenses
        .filter(e => ['draft', 'submitted', 'under_review'].includes(e.status))
        .reduce((sum, e) => sum + (e.amount || 0), 0),
      approvedAmount: expenses
        .filter(e => e.status === 'approved')
        .reduce((sum, e) => sum + (e.amount || 0), 0),
      reimbursedAmount: expenses
        .filter(e => e.status === 'reimbursed')
        .reduce((sum, e) => sum + (e.amount || 0), 0),
    };

    return NextResponse.json({ expenses, stats });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ message: 'Error fetching expenses', error: error.message }, { status: 500 });
  }
}

// POST - Create new expense
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
    
    const body = await req.json();
    const { 
      category, 
      description, 
      amount, 
      currency,
      expenseDate, 
      receiptUrl,
      receiptNumber,
      vendor,
      projectName,
      clientName,
      billable,
      submitNow
    } = body;

    // Validation
    if (!category || !description || !amount || !expenseDate) {
      return NextResponse.json({ 
        message: 'Missing required fields',
        required: ['category', 'description', 'amount', 'expenseDate']
      }, { status: 400 });
    }

    const expenseNumber = await generateExpenseNumber();

    const expense = await Expense.create({
      expenseNumber,
      employeeId: userId,
      companyId: companyId || body.companyId,
      category,
      description,
      amount: parseFloat(amount),
      currency: currency || 'INR',
      expenseDate: new Date(expenseDate),
      status: submitNow ? 'submitted' : 'draft',
      receiptUrl,
      receiptNumber,
      vendor,
      projectName,
      clientName,
      billable: billable || false,
      comments: [],
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate('employeeId', 'name email department designation');

    return NextResponse.json({ 
      message: `Expense ${submitNow ? 'submitted' : 'saved as draft'} successfully`,
      expense: populatedExpense 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ message: 'Error creating expense', error: error.message }, { status: 500 });
  }
}

// PATCH - Update expense (submit, approve, reject, reimburse)
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
      approvalNotes,
      reimbursed,
      paymentMethod,
      paymentReference,
      comment 
    } = body;

    if (!id) {
      return NextResponse.json({ message: 'Expense ID is required' }, { status: 400 });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }

    const isOwner = expense.employeeId.toString() === userId;
    const canManage = ['admin', 'hr', 'manager'].includes(userRole);
    const isApprover = expense.approverId?.toString() === userId || canManage;

    const updateData: any = {};
    
    // Status updates
    if (status) {
      // Employee can only submit draft expenses
      if (status === 'submitted' && isOwner && expense.status === 'draft') {
        updateData.status = 'submitted';
        updateData.submissionDate = new Date();
      }
      // Approver can approve/reject
      else if (['approved', 'rejected'].includes(status) && isApprover) {
        if (!['submitted', 'under_review'].includes(expense.status)) {
          return NextResponse.json({ message: 'Cannot change status of processed expense' }, { status: 400 });
        }
        updateData.status = status;
        
        if (status === 'approved') {
          updateData.approvedBy = userId;
          updateData.approvedAt = new Date();
          updateData.approvalNotes = approvalNotes;
        }
        
        if (status === 'rejected') {
          if (!rejectionReason) {
            return NextResponse.json({ message: 'Rejection reason is required' }, { status: 400 });
          }
          updateData.rejectionReason = rejectionReason;
        }
      }
      // Admin/HR can mark as reimbursed
      else if (status === 'reimbursed' && canManage) {
        if (expense.status !== 'approved') {
          return NextResponse.json({ message: 'Can only reimburse approved expenses' }, { status: 400 });
        }
        updateData.status = 'reimbursed';
        updateData.reimbursedAt = new Date();
        updateData.reimbursedBy = userId;
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        if (paymentReference) updateData.paymentReference = paymentReference;
      }
    }
    
    // Assign approver
    if (approverId && canManage) {
      updateData.approverId = approverId;
    }

    // Add comment
    if (comment) {
      const newComment = {
        author: new mongoose.Types.ObjectId(userId),
        authorName: userName,
        role: userRole,
        message: comment,
        createdAt: new Date(),
      };
      
      await Expense.findByIdAndUpdate(id, {
        $push: { comments: newComment }
      });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(id, updateData, { new: true })
      .populate('employeeId', 'name email department designation')
      .populate('approverId', 'name email')
      .populate('approvedBy', 'name email')
      .populate('reimbursedBy', 'name email');

    return NextResponse.json({ 
      message: 'Expense updated successfully',
      expense: updatedExpense 
    });
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ message: 'Error updating expense', error: error.message }, { status: 500 });
  }
}

// DELETE - Delete draft expense
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
      return NextResponse.json({ message: 'Expense ID is required' }, { status: 400 });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }

    const isOwner = expense.employeeId.toString() === userId;
    const isAdmin = userRole === 'admin';
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: 'You can only delete your own expenses' }, { status: 403 });
    }

    if (expense.status !== 'draft' && !isAdmin) {
      return NextResponse.json({ message: 'Can only delete draft expenses' }, { status: 400 });
    }

    await Expense.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ message: 'Error deleting expense', error: error.message }, { status: 500 });
  }
}
