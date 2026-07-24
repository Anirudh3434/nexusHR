import mongoose, { Schema, Document } from 'mongoose';

export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export interface ISprint extends Document {
  sprintNumber: string;
  name: string;
  description?: string;
  
  // Project association
  projectId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  
  // Timeline
  startDate: Date;
  endDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  
  // Status
  status: SprintStatus;
  
  // Goals
  goals?: string[];
  
  // Task tracking
  taskIds: mongoose.Types.ObjectId[];
  totalTasks: number;
  completedTasks: number;
  
  // Velocity tracking
  storyPoints?: number;
  completedStoryPoints?: number;
  
  // Burndown data
  burndownData?: Array<{
    date: Date;
    remainingStoryPoints: number;
    remainingTasks: number;
  }>;
  
  // Creator
  createdBy: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const SprintSchema = new Schema<ISprint>({
  sprintNumber: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Sprint name is required'],
    trim: true,
    maxlength: [200, 'Sprint name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
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
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
  },
  actualStartDate: {
    type: Date,
  },
  actualEndDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning',
  },
  goals: [{
    type: String,
    maxlength: [500, 'Goal cannot exceed 500 characters'],
  }],
  taskIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
  totalTasks: {
    type: Number,
    default: 0,
    min: [0, 'Total tasks cannot be negative'],
  },
  completedTasks: {
    type: Number,
    default: 0,
    min: [0, 'Completed tasks cannot be negative'],
  },
  storyPoints: {
    type: Number,
    default: 0,
    min: [0, 'Story points cannot be negative'],
  },
  completedStoryPoints: {
    type: Number,
    default: 0,
    min: [0, 'Completed story points cannot be negative'],
  },
  burndownData: [{
    date: {
      type: Date,
      required: true,
    },
    remainingStoryPoints: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingTasks: {
      type: Number,
      required: true,
      min: 0,
    },
  }],
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
SprintSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Indexes for better query performance
SprintSchema.index({ projectId: 1, status: 1 });
SprintSchema.index({ companyId: 1, status: 1 });
SprintSchema.index({ startDate: 1, endDate: 1 });
SprintSchema.index({ status: 1, endDate: 1 });

const Sprint = (mongoose.models.Sprint as mongoose.Model<ISprint>) || mongoose.model<ISprint>('Sprint', SprintSchema);

export default Sprint;
