import mongoose, { Schema, Document } from 'mongoose';

export type ExpenseCategory = 
  | 'travel'
  | 'meals'
  | 'transportation'
  | 'accommodation'
  | 'office_supplies'
  | 'training'
  | 'communication'
  | 'entertainment'
  | 'medical'
  | 'other';

export type ExpenseStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'reimbursed';

export interface IExpense extends Document {
  // Identification
  expenseNumber: string;
  
  // Who submitted
  employeeId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  
  // Expense Details
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string; // INR, USD, EUR, etc.
  exchangeRate?: number; // If in foreign currency
  amountInBase?: number; // Converted to company base currency
  
  // Date
  expenseDate: Date;
  submissionDate: Date;
  
  // Receipt
  receiptUrl?: string;
  receiptNumber?: string;
  vendor?: string;
  
  // Status
  status: ExpenseStatus;
  
  // Project/Client (optional)
  projectName?: string;
  clientName?: string;
  billable: boolean;
  
  // Approval workflow
  approverId?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  approvalNotes?: string;
  
  // Reimbursement
  reimbursedAt?: Date;
  reimbursedBy?: mongoose.Types.ObjectId;
  paymentMethod?: string; // bank_transfer, cash, check
  paymentReference?: string;
  
  // Rejection
  rejectionReason?: string;
  
  // Comments
  comments?: {
    author: mongoose.Types.ObjectId;
    authorName: string;
    role: string;
    message: string;
    createdAt: Date;
  }[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
  expenseNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee ID is required'],
    index: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true,
  },
  
  // Expense Details
  category: {
    type: String,
    required: true,
    enum: [
      'travel',
      'meals',
      'transportation',
      'accommodation',
      'office_supplies',
      'training',
      'communication',
      'entertainment',
      'medical',
      'other',
    ],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
  },
  exchangeRate: {
    type: Number,
    default: 1,
  },
  amountInBase: {
    type: Number,
  },
  
  // Dates
  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required'],
  },
  submissionDate: {
    type: Date,
    default: Date.now,
  },
  
  // Receipt
  receiptUrl: {
    type: String,
  },
  receiptNumber: {
    type: String,
  },
  vendor: {
    type: String,
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'reimbursed'],
    default: 'draft',
    index: true,
  },
  
  // Project/Client
  projectName: {
    type: String,
  },
  clientName: {
    type: String,
  },
  billable: {
    type: Boolean,
    default: false,
  },
  
  // Approval
  approverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  approvalNotes: {
    type: String,
  },
  
  // Reimbursement
  reimbursedAt: {
    type: Date,
  },
  reimbursedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'check', 'other'],
  },
  paymentReference: {
    type: String,
  },
  
  // Rejection
  rejectionReason: {
    type: String,
  },
  
  // Comments
  comments: [{
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Compound indexes
ExpenseSchema.index({ companyId: 1, status: 1, createdAt: -1 });
ExpenseSchema.index({ employeeId: 1, status: 1 });
ExpenseSchema.index({ expenseDate: -1 });

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
