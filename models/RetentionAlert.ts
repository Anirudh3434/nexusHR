import mongoose, { Schema, model, models } from 'mongoose';

const RetentionAlertSchema = new Schema({
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
  predictionId: {
    type: Schema.Types.ObjectId,
    ref: 'RetentionPrediction',
  },
  alertType: {
    type: String,
    required: true,
    enum: ['risk_increase', 'critical_risk', 'pattern_change', 'threshold_crossed'],
  },
  severity: {
    type: String,
    required: true,
    enum: ['info', 'warning', 'critical'],
    default: 'warning',
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  details: {
    type: Schema.Types.Mixed,
  },
  acknowledged: {
    type: Boolean,
    default: false,
    index: true,
  },
  acknowledgedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  acknowledgedAt: {
    type: Date,
  },
  actionTaken: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
RetentionAlertSchema.index({ companyId: 1, acknowledged: 1, severity: 1, createdAt: -1 });
RetentionAlertSchema.index({ employeeId: 1, createdAt: -1 });
RetentionAlertSchema.index({ companyId: 1, createdAt: -1 });

const RetentionAlert = models.RetentionAlert || model('RetentionAlert', RetentionAlertSchema);

export default RetentionAlert;
