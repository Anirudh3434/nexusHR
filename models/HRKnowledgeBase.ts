import mongoose, { Schema, model, models } from 'mongoose';

const HRKnowledgeBaseSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['pto', 'holidays', 'benefits', 'handbook', 'procedures', 'payroll', 'recruitment', 'performance'],
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  keywords: [{
    type: String,
  }],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  lastUpdatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  priority: {
    type: Number,
    default: 0, // Higher priority articles are shown first in search results
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  helpfulCount: {
    type: Number,
    default: 0,
  },
  notHelpfulCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
HRKnowledgeBaseSchema.index({ companyId: 1, category: 1, isActive: 1 });
HRKnowledgeBaseSchema.index({ companyId: 1, isActive: 1, priority: -1 });
HRKnowledgeBaseSchema.index({ keywords: 1 });

const HRKnowledgeBase = models.HRKnowledgeBase || model('HRKnowledgeBase', HRKnowledgeBaseSchema);

export default HRKnowledgeBase;
