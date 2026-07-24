import mongoose, { Schema, Document } from 'mongoose';

export type TaskStatus = 'backlog' | 'to_do' | 'in_progress' | 'in_review' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType = 'story' | 'bug' | 'epic' | 'task' | 'subtask' | 'improvement';

export interface ITask extends Document {
  taskNumber: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;

  // Project association
  projectId: mongoose.Types.ObjectId;

  // Assignment
  assignedTo?: mongoose.Types.ObjectId[]; // Multiple assignees
  assignedBy: mongoose.Types.ObjectId;

  // Timeline
  startDate?: Date;
  dueDate: Date;
  completedAt?: Date;

  // Progress
  estimatedHours?: number;
  actualHours?: number;
  progressPercentage: number;

  // Custom Status
  customStatus?: {
    id: string;
    name: string;
    color?: string;
  };
  
  // Agile/Scrum
  parentId?: mongoose.Types.ObjectId; // Parent task if this is a subtask
  sprintId?: mongoose.Types.ObjectId;
  storyPoints?: number;
  position?: number; // Position in board column
  boardColumnId?: string; // Reference to board column
  
  // Dependencies
  dependsOn?: mongoose.Types.ObjectId[]; // Tasks that must be completed first
  blocks?: mongoose.Types.ObjectId[]; // Tasks blocked by this task
  relatesTo?: mongoose.Types.ObjectId[]; // Related tasks
  duplicates?: mongoose.Types.ObjectId[]; // Tasks this duplicates
  isDuplicatedBy?: mongoose.Types.ObjectId[]; // Tasks that duplicate this
  
  // Details
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
  
  // Comments
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
  
  // Company
  companyId: mongoose.Types.ObjectId;
  
  // Creator
  createdBy: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
  },
  attachments: [{
    name: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const LabelSchema = new Schema({
  _id: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
}, { _id: false });

const AttachmentSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const TaskSchema = new Schema<ITask>({
  taskNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  status: {
    type: String,
    default: 'to_do',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  taskType: {
    type: String,
    enum: ['story', 'bug', 'epic', 'task', 'subtask', 'improvement'],
    default: 'task',
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  assignedTo: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startDate: {
    type: Date,
  },
  dueDate: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
  },
  actualHours: {
    type: Number,
    default: 0,
    min: [0, 'Actual hours cannot be negative'],
  },
  progressPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be less than 0'],
    max: [100, 'Progress cannot exceed 100'],
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    index: true,
  },
  sprintId: {
    type: Schema.Types.ObjectId,
    ref: 'Sprint',
    index: true,
  },
  storyPoints: {
    type: Number,
    min: [0, 'Story points cannot be negative'],
  },
  position: {
    type: Number,
    default: 0,
  },
  boardColumnId: {
    type: String,
  },
  customStatus: {
    id: {
      type: String,
    },
    name: {
      type: String,
    },
    color: {
      type: String,
    },
  },
  dependsOn: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
  blocks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
  relatesTo: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
  duplicates: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
  isDuplicatedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
  tags: [{
    type: String,
  }],
  attachments: [AttachmentSchema],
  labels: [LabelSchema],
  comments: [CommentSchema],
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

(TaskSchema as any).set('strictPopulate', false);

// Update timestamp on save
TaskSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Indexes for better query performance
TaskSchema.index({ taskNumber: 1 });
TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ companyId: 1, status: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ priority: 1, status: 1 });

if (mongoose.models && mongoose.models.Task) {
  delete mongoose.models.Task;
}
const Task = mongoose.model<ITask>('Task', TaskSchema);

export default Task;
