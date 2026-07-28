import mongoose, { Schema, model, models } from 'mongoose';

const RetentionFactorSchema = new Schema({
  name: {
    type: String,
    required: true,
    enum: ['attendance', 'performance', 'engagement', 'tenure', 'compensation', 'workload', 'manager_relationship'],
  },
  value: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  trend: {
    type: String,
    enum: ['improving', 'stable', 'declining'],
    default: 'stable',
  },
});

const RetentionPredictionSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  assessmentDate: {
    type: Date,
    required: true,
    index: true,
  },
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  riskLevel: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
  },
  factors: [RetentionFactorSchema],
  modelVersion: {
    type: String,
    default: '1.0-rule-based',
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 70,
  },
  // Metadata for tracking changes
  previousRiskScore: {
    type: Number,
  },
  riskChange: {
    type: Number, // positive = increased risk, negative = decreased risk
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
RetentionPredictionSchema.index({ employeeId: 1, assessmentDate: -1 });
RetentionPredictionSchema.index({ companyId: 1, assessmentDate: -1 });
RetentionPredictionSchema.index({ companyId: 1, riskLevel: 1, assessmentDate: -1 });

const RetentionPrediction = models.RetentionPrediction || model('RetentionPrediction', RetentionPredictionSchema);

export default RetentionPrediction;
