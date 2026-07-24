import mongoose, { Schema, Document } from 'mongoose';

export type SurveyType = 'engagement' | 'pulse' | 'feedback' | 'onboarding' | 'exit' | 'training' | 'performance' | 'custom';
export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';
export type QuestionType = 'text' | 'rating' | 'multiple_choice' | 'checkbox' | 'yes_no' | 'dropdown';

export interface IQuestion {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // For multiple_choice, checkbox, dropdown
  order: number;
}

export interface ISurvey extends Document {
  surveyNumber: string;
  title: string;
  description: string;
  type: SurveyType;
  status: SurveyStatus;
  
  // Questions
  questions: IQuestion[];
  
  // Targeting
  companyId: mongoose.Types.ObjectId;
  targetDepartments?: string[];
  targetEmployees?: mongoose.Types.ObjectId[];
  isAnonymous: boolean;
  
  // Scheduling
  startDate?: Date;
  endDate?: Date;
  
  // Creator
  createdBy: mongoose.Types.ObjectId;
  
  // Response tracking
  totalSent: number;
  totalResponses: number;
  responseRate: number;
  
  // Settings
  allowMultipleResponses: boolean;
  showResultsToEmployees: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: [500, 'Question text cannot exceed 500 characters'],
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'rating', 'multiple_choice', 'checkbox', 'yes_no', 'dropdown'],
  },
  required: {
    type: Boolean,
    default: true,
  },
  options: [{
    type: String,
    maxlength: [200, 'Option cannot exceed 200 characters'],
  }],
  order: {
    type: Number,
    required: true,
  },
});

const SurveySchema = new Schema<ISurvey>({
  surveyNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Survey title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  type: {
    type: String,
    required: true,
    enum: ['engagement', 'pulse', 'feedback', 'onboarding', 'exit', 'training', 'performance', 'custom'],
    default: 'custom',
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'active', 'closed', 'archived'],
    default: 'draft',
    index: true,
  },
  
  // Questions
  questions: [QuestionSchema],
  
  // Targeting
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true,
  },
  targetDepartments: [{
    type: String,
    trim: true,
  }],
  targetEmployees: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  
  // Scheduling
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  
  // Creator
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required'],
  },
  
  // Response tracking
  totalSent: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalResponses: {
    type: Number,
    default: 0,
    min: 0,
  },
  responseRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  // Settings
  allowMultipleResponses: {
    type: Boolean,
    default: false,
  },
  showResultsToEmployees: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Compound indexes
SurveySchema.index({ companyId: 1, status: 1, createdAt: -1 });
SurveySchema.index({ companyId: 1, type: 1, status: 1 });
SurveySchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.models.Survey || mongoose.model<ISurvey>('Survey', SurveySchema);
