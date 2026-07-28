import mongoose, { Schema, model, models } from 'mongoose';

const ReportComponentSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['chart', 'table', 'metric', 'text'],
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number, required: true },
    h: { type: Number, required: true },
  },
  config: {
    type: Schema.Types.Mixed,
    required: true,
  },
});

const ReportParameterSchema = new Schema({
  key: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['date', 'select', 'multiselect'],
  },
  options: [String],
  defaultValue: Schema.Types.Mixed,
});

const ReportScheduleSchema = new Schema({
  enabled: {
    type: Boolean,
    default: false,
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
  },
  recipients: [String],
  lastRun: Date,
  nextRun: Date,
});

const ReportTemplateSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isTemplate: {
    type: Boolean,
    default: false,
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['attendance', 'performance', 'payroll', 'recruitment', 'retention', 'general'],
    index: true,
  },
  layout: {
    components: [ReportComponentSchema],
  },
  parameters: [ReportParameterSchema],
  sharedWith: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  schedule: {
    type: ReportScheduleSchema,
    default: () => ({
      enabled: false,
      frequency: 'weekly',
      recipients: [],
    }),
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
ReportTemplateSchema.index({ companyId: 1, category: 1, isTemplate: 1 });
ReportTemplateSchema.index({ companyId: 1, createdBy: 1 });
ReportTemplateSchema.index({ companyId: 1, isPublic: 1 });

const ReportTemplate = models.ReportTemplate || model('ReportTemplate', ReportTemplateSchema);

export default ReportTemplate;
