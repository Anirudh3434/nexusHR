import mongoose, { Schema, Document } from 'mongoose';

export type TimeLogStatus = 'running' | 'completed' | 'deleted';

export interface ITimeLog extends Document {
  logNumber: string;
  
  // Task association
  taskId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  
  // Employee
  employeeId: mongoose.Types.ObjectId;
  
  // Time tracking
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  status: TimeLogStatus;
  
  // Description
  description?: string;
  
  // Company
  companyId: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const TimeLogSchema = new Schema<ITimeLog>({
  logNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
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
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number,
    min: [0, 'Duration cannot be negative'],
  },
  status: {
    type: String,
    enum: ['running', 'completed', 'deleted'],
    default: 'running',
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
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
TimeLogSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Indexes for better query performance
TimeLogSchema.index({ employeeId: 1, status: 1 });
TimeLogSchema.index({ taskId: 1, startTime: -1 });
TimeLogSchema.index({ projectId: 1, startTime: -1 });
TimeLogSchema.index({ companyId: 1, startTime: -1 });

const TimeLog = (mongoose.models.TimeLog as mongoose.Model<ITimeLog>) || mongoose.model<ITimeLog>('TimeLog', TimeLogSchema);

export default TimeLog;
