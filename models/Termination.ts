import mongoose, { Schema, Document } from 'mongoose';

export type TerminationType = 'voluntary' | 'involuntary' | 'retirement' | 'end_of_contract' | 'layoff';
export type TerminationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed';
export type TerminationReason = 
  | 'performance_issues'
  | 'misconduct'
  | 'attendance_violations'
  | 'violation_of_policy'
  | 'redundancy'
  | 'business_closure'
  | 'mutual_agreement'
  | 'end_of_contract'
  | 'retirement'
  | 'health_reasons'
  | 'other';

export interface ITermination extends Document {
  // Identification
  terminationNumber: string;
  
  // Parties involved
  employeeId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  initiatedBy: mongoose.Types.ObjectId; // HR who initiated
  
  // Approval workflow
  approverId?: mongoose.Types.ObjectId; // Manager/Admin assigned to approve
  approvedBy?: mongoose.Types.ObjectId; // Who actually approved
  approvedAt?: Date;
  
  // Termination details
  type: TerminationType;
  reason: TerminationReason;
  detailedReason?: string;
  
  // Dates
  noticeDate: Date; // When notice was given
  terminationDate: Date; // Last working date
  noticePeriodDays: number;
  
  // Status
  status: TerminationStatus;
  
  // Documents
  documents?: string[]; // URLs to termination docs, evidence, etc.
  
  // Severance/Settlement
  severanceAmount?: number;
  settlementNotes?: string;
  
  // Exit formalities (similar to resignation)
  exitInterviewCompleted: boolean;
  exitInterviewNotes?: string;
  assetsReturned: boolean;
  assetsReturnedNotes?: string;
  clearanceStatus: 'pending' | 'in_progress' | 'completed';
  
  // Rejection reason
  rejectionReason?: string;
  
  // Comments/Notes thread
  comments?: {
    author: mongoose.Types.ObjectId;
    authorName: string;
    role: string;
    message: string;
    createdAt: Date;
    internal: boolean;
  }[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const TerminationSchema = new Schema<ITermination>({
  terminationNumber: {
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
  initiatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Initiator is required'],
  },
  
  // Approval workflow
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
  
  // Termination details
  type: {
    type: String,
    required: true,
    enum: ['voluntary', 'involuntary', 'retirement', 'end_of_contract', 'layoff'],
    default: 'involuntary',
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'performance_issues',
      'misconduct',
      'attendance_violations',
      'violation_of_policy',
      'redundancy',
      'business_closure',
      'mutual_agreement',
      'end_of_contract',
      'retirement',
      'health_reasons',
      'other',
    ],
  },
  detailedReason: {
    type: String,
    maxlength: [2000, 'Detailed reason cannot exceed 2000 characters'],
  },
  
  // Dates
  noticeDate: {
    type: Date,
    required: [true, 'Notice date is required'],
    default: Date.now,
  },
  terminationDate: {
    type: Date,
    required: [true, 'Termination date is required'],
  },
  noticePeriodDays: {
    type: Number,
    required: true,
    min: [0, 'Notice period cannot be negative'],
    default: 30,
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'completed'],
    default: 'pending',
    index: true,
  },
  
  // Documents
  documents: [{
    type: String,
  }],
  
  // Settlement
  severanceAmount: {
    type: Number,
    min: [0, 'Severance cannot be negative'],
  },
  settlementNotes: {
    type: String,
  },
  
  // Exit formalities
  exitInterviewCompleted: {
    type: Boolean,
    default: false,
  },
  exitInterviewNotes: {
    type: String,
    maxlength: [2000, 'Exit interview notes cannot exceed 2000 characters'],
  },
  assetsReturned: {
    type: Boolean,
    default: false,
  },
  assetsReturnedNotes: {
    type: String,
  },
  clearanceStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending',
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
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    internal: {
      type: Boolean,
      default: true,
    },
  }],
}, {
  timestamps: true,
});

// Compound indexes
TerminationSchema.index({ companyId: 1, status: 1, createdAt: -1 });
TerminationSchema.index({ employeeId: 1, status: 1 });
TerminationSchema.index({ approverId: 1, status: 1 });

export default mongoose.models.Termination || mongoose.model<ITermination>('Termination', TerminationSchema);
