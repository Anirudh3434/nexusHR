import mongoose, { Schema, model, models } from 'mongoose';

const MessageSchema = new Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant'],
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  sources: [{
    articleId: {
      type: Schema.Types.ObjectId,
      ref: 'HRKnowledgeBase',
    },
    title: String,
    relevance: Number, // 0-1 score
  }],
});

const AIConversationLogSchema = new Schema({
  userId: {
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
  messages: [MessageSchema],
  category: {
    type: String,
    enum: ['pto', 'holidays', 'benefits', 'handbook', 'procedures', 'payroll', 'recruitment', 'performance', 'general', 'unknown'],
    default: 'general',
  },
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  feedback: {
    type: String,
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  resolvedAt: {
    type: Date,
  },
  sessionDuration: {
    type: Number, // in seconds
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
AIConversationLogSchema.index({ userId: 1, companyId: 1, startedAt: -1 });
AIConversationLogSchema.index({ companyId: 1, category: 1, createdAt: -1 });
AIConversationLogSchema.index({ createdAt: -1 }); // For cleanup jobs

const AIConversationLog = models.AIConversationLog || model('AIConversationLog', AIConversationLogSchema);

export default AIConversationLog;
