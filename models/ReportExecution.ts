import mongoose, { Schema, model, models } from 'mongoose';

const ReportExecutionSchema = new Schema({
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'ReportTemplate',
    required: true,
    index: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  executedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parameters: {
    type: Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true,
  },
  resultUrl: {
    type: String, // URL to stored report (Cloudinary/S3)
  },
  resultFormat: {
    type: String,
    enum: ['pdf', 'excel', 'json'],
  },
  executedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  error: {
    type: String,
  },
  recordCount: {
    type: Number, // Number of records in the report
  },
  fileSize: {
    type: Number, // Size in bytes
  },
  isScheduled: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
ReportExecutionSchema.index({ companyId: 1, executedAt: -1 });
ReportExecutionSchema.index({ templateId: 1, executedAt: -1 });
ReportExecutionSchema.index({ companyId: 1, status: 1 });

const ReportExecution = models.ReportExecution || model('ReportExecution', ReportExecutionSchema);

export default ReportExecution;
