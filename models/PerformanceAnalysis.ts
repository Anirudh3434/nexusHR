import mongoose, { Schema, model, models } from 'mongoose';

const PerformanceAnalysisSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  // Numerical score derived from metrics (1-10)
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 5,
  },
  // Qualitative Analysis
  summary: String,
  merits: [String],
  demerits: [String],
  suggestions: [String],
  
  // Snapshot of metrics used for this analysis
  metrics: {
    lateMinutes: Number,
    totalHours: Number,
    overtimeHours: Number,
    onTimeCheckIn: Boolean,
  },
  
  // AI Model info
  aiModel: {
    type: String,
    default: 'nvidia/llama-3.1-405b-instruct',
  },
  aiResponseId: String,
}, {
  timestamps: true,
});

// Index for fast daily lookups
PerformanceAnalysisSchema.index({ employeeId: 1, date: -1 });
PerformanceAnalysisSchema.index({ companyId: 1, date: -1 });

const PerformanceAnalysis = models.PerformanceAnalysis || model('PerformanceAnalysis', PerformanceAnalysisSchema);

export default PerformanceAnalysis;
