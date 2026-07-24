import mongoose, { Schema, model, models } from 'mongoose';

// Email service configuration for companies
const EmailConfigSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true,
  },
  // Email service provider
  provider: {
    type: String,
    enum: ['gmail', 'outlook', 'other'],
    required: true,
  },
  // Career/Recruitment email address
  careerEmail: {
    type: String,
    required: true,
  },
  // OAuth tokens (encrypted)
  accessToken: {
    type: String,
    select: false, // Don't return by default
  },
  refreshToken: {
    type: String,
    select: false,
  },
  tokenExpiry: {
    type: Date,
  },
  // IMAP/SMTP settings for non-OAuth
  imapHost: String,
  imapPort: Number,
  imapSecure: {
    type: Boolean,
    default: true,
  },
  smtpHost: String,
  smtpPort: Number,
  smtpSecure: {
    type: Boolean,
    default: true,
  },
  // Last sync info
  lastSyncAt: {
    type: Date,
    default: null,
  },
  lastSyncMessageId: {
    type: String,
    default: null,
  },
  // Auto-reply settings
  autoReplyEnabled: {
    type: Boolean,
    default: true,
  },
  autoReplyTemplate: {
    type: String,
    default: 'Thank you for your application. We have received your email and will review it shortly.',
  },
  // Job application detection
  jobKeywords: [{
    type: String,
    default: ['job', 'position', 'application', 'resume', 'cv', 'hiring', 'career'],
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const EmailConfig = models.EmailConfig || model('EmailConfig', EmailConfigSchema);

export default EmailConfig;
