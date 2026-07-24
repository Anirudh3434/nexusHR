import mongoose, { Schema, Document } from 'mongoose';

export type ActionType = 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'status_changed' 
  | 'assignee_changed' 
  | 'priority_changed' 
  | 'due_date_changed' 
  | 'comment_added' 
  | 'comment_deleted' 
  | 'attachment_added' 
  | 'attachment_removed' 
  | 'label_added' 
  | 'label_removed' 
  | 'sprint_changed' 
  | 'custom_status_changed';

export interface IActivityLog extends Document {
  taskId?: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  
  // User who performed the action
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail?: string;
  
  // Action details
  actionType?: ActionType;
  fieldName?: string; // Which field was changed (e.g., 'status', 'priority')
  oldValue?: any; // Previous value
  newValue?: any; // New value
  
  // For project/document level activities
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  action?: string;
  details?: string;
  
  // Additional context
  description?: string; // Human-readable description
  metadata?: Record<string, any>; // Additional context data
  
  // Timestamps
  createdAt: Date;
  timestamp?: Date;
  
  // Archiving
  isArchived: boolean;
  archivedAt?: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: false,
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
    required: false,
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
  userEmail: {
    type: String,
  },
  actionType: {
    type: String,
    enum: [
      'created', 
      'updated', 
      'deleted', 
      'status_changed', 
      'assignee_changed', 
      'priority_changed', 
      'due_date_changed', 
      'comment_added', 
      'comment_deleted', 
      'attachment_added', 
      'attachment_removed', 
      'label_added', 
      'label_removed', 
      'sprint_changed', 
      'custom_status_changed'
    ],
    required: false,
    index: true,
  },
  fieldName: {
    type: String,
  },
  oldValue: {
    type: Schema.Types.Mixed,
  },
  newValue: {
    type: Schema.Types.Mixed,
  },
  resourceType: {
    type: String,
  },
  resourceId: {
    type: String,
  },
  resourceName: {
    type: String,
  },
  action: {
    type: String,
  },
  details: {
    type: String,
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true,
  },
  archivedAt: {
    type: Date,
  },
});

// Indexes for better query performance
ActivityLogSchema.index({ taskId: 1, createdAt: -1 });
ActivityLogSchema.index({ projectId: 1, createdAt: -1 });
ActivityLogSchema.index({ companyId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ actionType: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // TTL index for 90 days

if (mongoose.models && mongoose.models.ActivityLog) {
  delete mongoose.models.ActivityLog;
}

const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
