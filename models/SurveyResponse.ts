import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswer {
  questionId: string;
  questionText: string;
  answer: string | string[] | number; // text, array for checkbox, number for rating
  questionType: string;
}

export interface ISurveyResponse extends Document {
  responseNumber: string;
  surveyId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  
  // Respondent info (null if anonymous)
  employeeId?: mongoose.Types.ObjectId;
  employeeName?: string;
  department?: string;
  
  // Answers
  answers: IAnswer[];
  
  // Metadata
  submittedAt: Date;
  timeToComplete: number; // in seconds
  ipAddress?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema({
  questionId: {
    type: String,
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  answer: {
    type: Schema.Types.Mixed,
    required: true,
  },
  questionType: {
    type: String,
    required: true,
  },
});

const SurveyResponseSchema = new Schema<ISurveyResponse>({
  responseNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  surveyId: {
    type: Schema.Types.ObjectId,
    ref: 'Survey',
    required: [true, 'Survey ID is required'],
    index: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    index: true,
  },
  
  // Respondent info
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  employeeName: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
  },
  
  // Answers
  answers: [AnswerSchema],
  
  // Metadata
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  timeToComplete: {
    type: Number,
    default: 0,
    min: 0,
  },
  ipAddress: {
    type: String,
  },
}, {
  timestamps: true,
});

// Compound indexes
SurveyResponseSchema.index({ surveyId: 1, employeeId: 1 });
SurveyResponseSchema.index({ companyId: 1, createdAt: -1 });
SurveyResponseSchema.index({ surveyId: 1, createdAt: -1 });

// Ensure one response per employee per survey (if not anonymous and not multiple responses allowed)
SurveyResponseSchema.index({ surveyId: 1, employeeId: 1 }, {
  unique: true,
  partialFilterExpression: { employeeId: { $exists: true } }
});

export default mongoose.models.SurveyResponse || mongoose.model<ISurveyResponse>('SurveyResponse', SurveyResponseSchema);
