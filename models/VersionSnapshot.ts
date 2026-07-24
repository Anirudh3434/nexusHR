import mongoose, { Schema, Document } from 'mongoose';

export type SnapshotReason = 'manual' | 'status_change' | 'sprint_change' | 'completion' | 'deletion';

export interface IVersionSnapshot extends Document {
  taskId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  
  // User who triggered the snapshot
  userId: mongoose.Types.ObjectId;
  userName: string;
  
  // Snapshot details
  reason: SnapshotReason;
  description?: string;
  
  // Complete task state at this point
  taskData: {
    taskNumber: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    taskType: string;
    assignedTo: mongoose.Types.ObjectId[];
    assignedBy: mongoose.Types.ObjectId;
    startDate?: Date;
    dueDate: Date;
    completedAt?: Date;
    estimatedHours?: number;
    actualHours?: number;
    progressPercentage: number;
    customStatus?: {
      id: string;
      name: string;
      color?: string;
    };
    parentId?: mongoose.Types.ObjectId;
    sprintId?: mongoose.Types.ObjectId;
    storyPoints?: number;
    position?: number;
    boardColumnId?: string;
    dependsOn?: mongoose.Types.ObjectId[];
    blocks?: mongoose.Types.ObjectId[];
    relatesTo?: mongoose.Types.ObjectId[];
    duplicates?: mongoose.Types.ObjectId[];
    isDuplicatedBy?: mongoose.Types.ObjectId[];
    tags?: string[];
    labels?: Array<{
      _id: string;
      name: string;
      color: string;
    }>;
    attachments?: Array<{
      name: string;
      url: string;
      uploadedAt: Date;
    }>;
    comments?: Array<{
      userId: mongoose.Types.ObjectId;
      userName: string;
      text: string;
      createdAt: Date;
      attachments?: Array<{
        name: string;
        url: string;
      }>;
    }>;
  };
  
  // Timestamps
  createdAt: Date;
  
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
}

const VersionSnapshotSchema = new Schema<IVersionSnapshot>({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true,
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    enum: ['manual', 'status_change', 'sprint_change', 'completion', 'deletion'],
    required: true,
    index: true,
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  taskData: {
    type: Schema.Types.Mixed,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
});

// Indexes for better query performance
VersionSnapshotSchema.index({ taskId: 1, createdAt: -1 });
VersionSnapshotSchema.index({ projectId: 1, createdAt: -1 });
VersionSnapshotSchema.index({ companyId: 1, createdAt: -1 });
VersionSnapshotSchema.index({ reason: 1, createdAt: -1 });

if (mongoose.models && mongoose.models.VersionSnapshot) {
  delete mongoose.models.VersionSnapshot;
}

const VersionSnapshot = mongoose.model<IVersionSnapshot>('VersionSnapshot', VersionSnapshotSchema);

export default VersionSnapshot;
