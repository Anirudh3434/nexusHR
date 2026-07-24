import mongoose, { Schema, Document } from 'mongoose';

export interface IResignation extends Document {
  employeeId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  submittedBy: mongoose.Types.ObjectId;
  resignationDate: Date;
  lastWorkingDate: Date;
  reason: string;
  detailedReason?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';
  noticePeriodDays: number;
  exitInterviewCompleted: boolean;
  exitInterviewNotes?: string;
  hrRemarks?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  assetsReturned: boolean;
  assetsReturnedNotes?: string;
  clearanceStatus: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const ResignationSchema = new Schema<IResignation>({
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
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Submitted by is required'],
  },
  resignationDate: {
    type: Date,
    required: [true, 'Resignation date is required'],
    default: Date.now,
  },
  lastWorkingDate: {
    type: Date,
    required: [true, 'Last working date is required'],
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    enum: ['better_opportunity', 'personal_reasons', 'relocation', 'health_issues', 'higher_studies', 'entrepreneurship', 'work_environment', 'career_change', 'other'],
  },
  detailedReason: {
    type: String,
    maxlength: [1000, 'Detailed reason cannot exceed 1000 characters'],
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'withdrawn'],
    default: 'pending',
    index: true,
  },
  noticePeriodDays: {
    type: Number,
    required: [true, 'Notice period days is required'],
    min: [0, 'Notice period cannot be negative'],
  },
  exitInterviewCompleted: {
    type: Boolean,
    default: false,
  },
  exitInterviewNotes: {
    type: String,
    maxlength: [2000, 'Exit interview notes cannot exceed 2000 characters'],
  },
  hrRemarks: {
    type: String,
    maxlength: [1000, 'HR remarks cannot exceed 1000 characters'],
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
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
}, {
  timestamps: true,
});

// Compound index to prevent duplicate active resignations per employee
ResignationSchema.index({ employeeId: 1, status: 1 }, {
  partialFilterExpression: {
    status: { $in: ['pending', 'under_review', 'approved'] }
  }
});

export default mongoose.models.Resignation || mongoose.model<IResignation>('Resignation', ResignationSchema);
