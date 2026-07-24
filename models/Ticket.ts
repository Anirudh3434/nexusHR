import mongoose, { Schema, Document } from 'mongoose';

export type TicketCategory = 'it_support' | 'hardware' | 'software' | 'facilities' | 'hr_policy' | 'payroll' | 'leave' | 'attendance' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed' | 'cancelled';

export interface ITicket extends Document {
  ticketNumber: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  
  // Reporter info
  reportedBy: mongoose.Types.ObjectId;
  employeeId?: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  department?: string;
  
  // Assignment
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  
  // Resolution
  resolutionNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  
  // Closure
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  
  // Tracking
  dueDate?: Date;
  attachments?: string[];
  
  // Comments
  comments?: {
    author: mongoose.Types.ObjectId;
    authorName: string;
    message: string;
    createdAt: Date;
    internal: boolean;
  }[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Time tracking
  timeSpent?: number; // in minutes
}

const TicketSchema = new Schema<ITicket>({
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  category: {
    type: String,
    required: true,
    enum: ['it_support', 'hardware', 'software', 'facilities', 'hr_policy', 'payroll', 'leave', 'attendance', 'other'],
    default: 'other',
    index: true,
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'in_progress', 'pending', 'resolved', 'closed', 'cancelled'],
    default: 'open',
    index: true,
  },
  
  // Reporter info
  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  department: {
    type: String,
    trim: true,
  },
  
  // Assignment
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  assignedAt: {
    type: Date,
  },
  
  // Resolution
  resolutionNotes: {
    type: String,
    maxlength: [2000, 'Resolution notes cannot exceed 2000 characters'],
  },
  resolvedAt: {
    type: Date,
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Closure
  closedAt: {
    type: Date,
  },
  closedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Tracking
  dueDate: {
    type: Date,
  },
  attachments: [{
    type: String, // URLs to attachments
  }],
  
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
    message: {
      type: String,
      required: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    internal: {
      type: Boolean,
      default: false, // internal comments visible only to staff
    },
  }],
  
  // Time tracking
  timeSpent: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// Compound indexes
TicketSchema.index({ companyId: 1, status: 1, createdAt: -1 });
TicketSchema.index({ companyId: 1, category: 1, status: 1 });
TicketSchema.index({ assignedTo: 1, status: 1 });
TicketSchema.index({ reportedBy: 1, createdAt: -1 });

export default mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema);
