import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/models/Expense';
import mongoose from 'mongoose';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

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
    
    const auth = await getAuthInfo();
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = auth.userId;
    const userRole = auth.role || 'employee';
    const isSuperAdmin = userRole === 'super_admin';
    const isEmployee = userRole === 'employee';
    
    const { searchParams } = new URL(req.url);
    const urlCompanyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const category = searchParams.get('category');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    if (urlCompanyId && !isSuperAdmin && urlCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const query: any = {};

    // Role-based filtering + tenant scope (companyId ALWAYS from session)
    if (isEmployee) {
      // Employees see only their own; DELETE any ?employeeId= override
      query.employeeId = userId;
      if (auth.companyId) query.companyId = auth.companyId;
    } else if (isSuperAdmin) {
      const companyId = urlCompanyId || auth.companyId;
      if (companyId) query.companyId = companyId;
      if (employeeId) query.employeeId = employeeId;
    } else {
      if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
      query.companyId = auth.companyId;
      if (employeeId) query.employeeId = employeeId;
    }

    if (status) query.status = status;
    // NOTE: employee ?employeeId= override intentionally deleted (forced to own above)
    if (!isEmployee && employeeId) query.employeeId = employeeId;
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
    
    const auth = await getAuthInfo();
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = auth.userId;
    const companyId = auth.role === 'super_admin' ? (auth.companyId || undefined) : auth.companyId;
    if (!companyId && auth.role !== 'super_admin') {
      return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    }
    
    const body = await req.json();
    // Reject body companyId mismatch (except super_admin)
    if (body.companyId && auth.role !== 'super_admin' && body.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const resolvedCompanyId = auth.role === 'super_admin' ? (body.companyId || auth.companyId) : auth.companyId;
    if (!resolvedCompanyId) {
      return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    }
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
      companyId: resolvedCompanyId,
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

// PATCH - Update expense (submit, approve, reject, reimburse). Atomic to kill double-approve races.
export async function PATCH(req: Request) {
  try {
    await connectDB();
    
    const auth = await getAuthInfo();
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = auth.userId;
    const userRole = auth.role || 'employee';
    const isSuperAdmin = userRole === 'super_admin';
    
    const body = await req.json();
    // Allowlist: only these keys are honored
    const { 
      id, 
      status, 
      rejectionReason,
      approverId,
      approvalNotes,
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
    // Same-company check
    if (!isSuperAdmin && expense.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const isOwner = expense.employeeId.toString() === userId;
    const canManage = ['super_admin', 'admin', 'hr', 'manager'].includes(userRole);
    const isApprover = expense.approverId?.toString() === userId || canManage;
    const companyFilter: any = isSuperAdmin && !auth.companyId ? { _id: id } : { _id: id, companyId: expense.companyId };

    // Add comment (same-company only; allowlist: comment string only)
    if (comment) {
      if (typeof comment !== 'string') {
        return NextResponse.json({ message: 'Invalid comment' }, { status: 400 });
      }
      const newComment = {
        author: new mongoose.Types.ObjectId(userId),
        authorName: auth.email || 'Unknown',
        role: userRole,
        message: comment,
        createdAt: new Date(),
      };
      
      await Expense.findOneAndUpdate(companyFilter, {
        $push: { comments: newComment }
      });
    }

    let updatedExpense = null;

    // Status updates — all atomic with status preconditions; 409 on null (race / already processed)
    if (status) {
      // Owner submits own draft
      if (status === 'submitted') {
        if (!isOwner) return NextResponse.json({ message: 'Only the owner can submit this expense' }, { status: 403 });
        updatedExpense = await Expense.findOneAndUpdate(
          { ...companyFilter, employeeId: userId, status: 'draft' },
          { $set: { status: 'submitted', submissionDate: new Date() } },
          { new: true }
        );
        if (!updatedExpense) {
          return NextResponse.json({ message: 'Expense already submitted or modified' }, { status: 409 });
        }
      }
      // Approver-only approve/reject from submitted/under_review
      else if (['approved', 'rejected'].includes(status)) {
        if (!isApprover) return NextResponse.json({ message: 'Forbidden: approver only' }, { status: 403 });
        const setData: any = { status };
        if (status === 'approved') {
          setData.approvedBy = userId;
          setData.approvedAt = new Date();
          if (approvalNotes !== undefined) setData.approvalNotes = approvalNotes;
        }
        if (status === 'rejected') {
          if (!rejectionReason) {
            return NextResponse.json({ message: 'Rejection reason is required' }, { status: 400 });
          }
          setData.rejectionReason = rejectionReason;
        }
        updatedExpense = await Expense.findOneAndUpdate(
          { ...companyFilter, status: { $in: ['submitted', 'under_review'] } },
          { $set: setData },
          { new: true }
        );
        if (!updatedExpense) {
          return NextResponse.json({ message: 'Expense already processed or modified' }, { status: 409 });
        }
      }
      // Admin/HR reimburse approved only
      else if (status === 'reimbursed') {
        if (!hasRole(userRole, ['super_admin', 'admin', 'hr'])) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        const setData: any = { status: 'reimbursed', reimbursedAt: new Date(), reimbursedBy: userId };
        if (paymentMethod !== undefined) setData.paymentMethod = paymentMethod;
        if (paymentReference !== undefined) setData.paymentReference = paymentReference;
        updatedExpense = await Expense.findOneAndUpdate(
          { ...companyFilter, status: 'approved' },
          { $set: setData },
          { new: true }
        );
        if (!updatedExpense) {
          return NextResponse.json({ message: 'Can only reimburse approved expenses' }, { status: 409 });
        }
      } else {
        return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
      }
    }
    
    // Assign approver (staff only, allowlist)
    if (approverId) {
      if (!canManage) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      updatedExpense = await Expense.findOneAndUpdate(companyFilter, { $set: { approverId } }, { new: true });
    }

    const result = updatedExpense
      ? await Expense.findById(updatedExpense._id)
          .populate('employeeId', 'name email department designation')
          .populate('approverId', 'name email')
          .populate('approvedBy', 'name email')
          .populate('reimbursedBy', 'name email')
      : await Expense.findOne(companyFilter)
          .populate('employeeId', 'name email department designation')
          .populate('approverId', 'name email')
          .populate('approvedBy', 'name email')
          .populate('reimbursedBy', 'name email');

    return NextResponse.json({ 
      message: 'Expense updated successfully',
      expense: result 
    });
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ message: 'Error updating expense', error: error.message }, { status: 500 });
  }
}

// DELETE - Delete draft expense (atomic, tenant-scoped)
export async function DELETE(req: Request) {
  try {
    await connectDB();
    
    const auth = await getAuthInfo();
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = auth.userId;
    const userRole = auth.role || 'employee';
    const isSuperAdmin = userRole === 'super_admin';
    const isAdmin = hasRole(userRole, ['super_admin', 'admin']);
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Expense ID is required' }, { status: 400 });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }
    if (!isSuperAdmin && expense.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const isOwner = expense.employeeId.toString() === userId;
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: 'You can only delete your own expenses' }, { status: 403 });
    }

    // Owners can only delete drafts (atomic: race returns 409); admins tenant-scoped delete
    const filter: any = isAdmin
      ? (isSuperAdmin && !auth.companyId ? { _id: id } : { _id: id, companyId: expense.companyId })
      : { _id: id, companyId: expense.companyId, employeeId: userId, status: 'draft' };
    const deleted = await Expense.findOneAndDelete(filter);

    if (!deleted) {
      if (!isAdmin) {
        return NextResponse.json({ message: 'Can only delete draft expenses' }, { status: 409 });
      }
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ message: 'Error deleting expense', error: error.message }, { status: 500 });
  }
}
