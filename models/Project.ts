import mongoose, { Schema, Document } from 'mongoose';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export interface IProjectMember {
  employeeId: mongoose.Types.ObjectId;
  role: 'project_manager' | 'team_lead' | 'developer' | 'designer' | 'tester' | 'analyst' | 'other';
  joinedAt: Date;
  allocationPercentage: number; // Percentage of time allocated to this project
}

export interface IMilestone {
  id: string;
  name: string;
  description?: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completedAt?: Date;
}

export interface IBoardColumn {
  id: string;
  name: string;
  status: string;
  color?: string;
  position: number;
  wipLimit?: number; // Work in progress limit
  allowedTransitions?: string[]; // Which statuses can transition to this one
  requiredFields?: string[]; // Required fields when moving to this status
  autoAssign?: string; // Auto-assign to specific role
  slaHours?: number; // SLA in hours for this status
  customStatuses?: Array<{
    id: string;
    name: string;
    color?: string;
    position: number;
  }>; // Custom sub-statuses within this column
}

export interface IBoard {
  id: string;
  name: string;
  type: 'kanban' | 'scrum' | 'list';
  columns: IBoardColumn[];
  defaultView: 'board' | 'list' | 'timeline';
}

export interface IProject extends Document {
  projectNumber: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  
  // Timeline
  startDate?: Date;
  endDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  
  // Team
  companyId: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId; // Project manager
  members: IProjectMember[];
  
  // Budget
  budget?: number;
  spent?: number;
  currency?: string;
  
  // Progress
  progressPercentage: number;
  milestones: IMilestone[];
  
  // Agile/Board Configuration
  board?: IBoard;
  useSprints: boolean;
  
  // Comment Automation
  autoCommentRules?: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    template: string;
    enabled: boolean;
    createdBy?: string;
    createdAt?: Date;
  }>;

  // Details
  department?: string;
  clientName?: string;
  clientContact?: string;
  githubRepo?: string;
  
  // Creator
  createdBy: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ProjectMemberSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['project_manager', 'team_lead', 'developer', 'designer', 'tester', 'analyst', 'other'],
    default: 'developer',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  allocationPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
  },
});

const MilestoneSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    maxlength: [200, 'Milestone name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    maxlength: [500, 'Milestone description cannot exceed 500 characters'],
  },
  dueDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'overdue'],
    default: 'pending',
  },
  completedAt: {
    type: Date,
  },
});

const BoardColumnSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    maxlength: [100, 'Column name cannot exceed 100 characters'],
  },
  status: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    default: '#3B82F6',
  },
  position: {
    type: Number,
    required: true,
    default: 0,
  },
  wipLimit: {
    type: Number,
    min: 0,
  },
  allowedTransitions: [{
    type: String,
  }],
  requiredFields: [{
    type: String,
  }],
  autoAssign: {
    type: String,
  },
  slaHours: {
    type: Number,
    min: 0,
  },
  customStatuses: [{
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: [50, 'Custom status name cannot exceed 50 characters'],
    },
    color: {
      type: String,
      default: '#6B7280',
    },
    position: {
      type: Number,
      default: 0,
    },
  }],
});

const BoardSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    default: 'Main Board',
  },
  type: {
    type: String,
    enum: ['kanban', 'scrum', 'list'],
    default: 'kanban',
  },
  columns: [BoardColumnSchema],
  defaultView: {
    type: String,
    enum: ['board', 'list', 'timeline'],
    default: 'board',
  },
});

const ProjectSchema = new Schema<IProject>({
  projectNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'planning',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  actualStartDate: {
    type: Date,
  },
  actualEndDate: {
    type: Date,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  members: [ProjectMemberSchema],
  budget: {
    type: Number,
    min: [0, 'Budget cannot be negative'],
  },
  spent: {
    type: Number,
    default: 0,
    min: [0, 'Spent cannot be negative'],
  },
  currency: {
    type: String,
    default: 'USD',
  },
  progressPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be less than 0'],
    max: [100, 'Progress cannot exceed 100'],
  },
  milestones: [MilestoneSchema],
  board: BoardSchema,
  useSprints: {
    type: Boolean,
    default: false,
  },
  autoCommentRules: [{
    id: String,
    fromStatus: String,
    toStatus: String,
    template: String,
    enabled: { type: Boolean, default: true },
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
  }],
  department: {
    type: String,
  },
  clientName: {
    type: String,
    trim: true,
  },
  clientContact: {
    type: String,
    trim: true,
  },
  githubRepo: {
    type: String,
    trim: true,
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

// Update timestamp on save
ProjectSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Indexes for better query performance
ProjectSchema.index({ companyId: 1, status: 1 });
ProjectSchema.index({ managerId: 1, status: 1 });
ProjectSchema.index({ 'members.employeeId': 1 });
ProjectSchema.index({ startDate: 1, endDate: 1 });

if (mongoose.models && mongoose.models.Project) {
  delete mongoose.models.Project;
}
const Project = mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
