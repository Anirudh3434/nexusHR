import mongoose, { Schema, Document } from 'mongoose';

export interface ITodayTaskItem {
  taskId: mongoose.Types.ObjectId;
  taskNumber: string;
  title: string;
  currentStatus: string;
  estimateTime: string;
  eodStatus: 'completed' | 'in_progress' | 'blocked' | 'pending';
  eodRemarks?: string;
  eodStatusHistory?: Array<{
    status: string;
    remarks?: string;
    updatedAt: Date;
    updatedBy?: string;
  }>;
}

export interface IComment {
  id: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  content: string;
  createdAt: Date;
  isManager: boolean;
}

export interface ITodayTaskReport extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  companyId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  items: ITodayTaskItem[];
  status: 'draft' | 'submitted';
  submittedAt?: Date;
  employeeComment?: string;
  comments: IComment[];
  managerApproval?: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  managerRemarks?: string;
  managerApprovedAt?: Date;
  managerApprovedBy?: mongoose.Types.ObjectId;
  editWindowExpiresAt?: Date;
  editRequestedBy?: mongoose.Types.ObjectId;
  editRequestedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TodayTaskItemSchema = new Schema({
  taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  taskNumber: { type: String, required: true },
  title: { type: String, required: true },
  currentStatus: { type: String, required: true },
  estimateTime: { type: String, required: true },
  eodStatus: { type: String, enum: ['completed', 'in_progress', 'blocked', 'pending'], default: 'in_progress' },
  eodRemarks: { type: String, default: '' },
  eodStatusHistory: [{
    status: { type: String },
    remarks: { type: String },
    updatedAt: { type: Date },
    updatedBy: { type: String }
  }]
});

const TodayTaskReportSchema = new Schema<ITodayTaskReport>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  date: { type: String, required: true, index: true },
  items: [TodayTaskItemSchema],
  status: { type: String, enum: ['draft', 'submitted'], default: 'draft' },
  submittedAt: { type: Date },
  employeeComment: { type: String },
  comments: [{
    id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    isManager: { type: Boolean, default: false }
  }],
  managerApproval: { type: String, enum: ['pending', 'approved', 'rejected', 'changes_requested'], default: 'pending' },
  managerRemarks: { type: String },
  managerApprovedAt: { type: Date },
  managerApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  editWindowExpiresAt: { type: Date },
  editRequestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  editRequestedAt: { type: Date }
}, { timestamps: true });

if (mongoose.models && mongoose.models.TodayTaskReport) {
  delete mongoose.models.TodayTaskReport;
}

const TodayTaskReport = mongoose.model<ITodayTaskReport>('TodayTaskReport', TodayTaskReportSchema);

export default TodayTaskReport;
