import mongoose, { Schema, model, models } from 'mongoose';

// Job applications received via email
const JobApplicationSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  // Email info
  emailMessageId: {
    type: String,
    required: true,
    unique: true,
  },
  threadId: {
    type: String,
    index: true,
  },
  fromEmail: {
    type: String,
    required: true,
  },
  fromName: {
    type: String,
    default: '',
  },
  subject: {
    type: String,
    default: '',
  },
  body: {
    type: String,
    default: '',
  },
  bodyText: { // Plain text version
    type: String,
    default: '',
  },
  receivedAt: {
    type: Date,
    default: Date.now,
  },
  // Parsed candidate info
  candidateName: {
    type: String,
    default: '',
  },
  candidatePhone: {
    type: String,
    default: '',
  },
  appliedPosition: {
    type: String,
    default: '',
  },
  // Additional candidate details
  experience: {
    type: String,
    default: '', // e.g., "3 years", "Fresher"
  },
  currentDesignation: {
    type: String,
    default: '',
  },
  skills: [{
    type: String,
  }],
  expectedSalary: {
    type: String,
    default: '',
  },
  noticePeriod: {
    type: String,
    default: '',
  },
  // Link to job position (if applied through website)
  jobPositionId: {
    type: Schema.Types.ObjectId,
    ref: 'JobPosition',
    default: null,
  },
  // Job ID for tracking (e.g., JB0001)
  jobId: {
    type: String,
    default: '',
  },
  // Attachments
  hasAttachments: {
    type: Boolean,
    default: false,
  },
  attachments: [{
    filename: String,
    mimeType: String,
    size: Number,
    fileUrl: String, // Stored file path
  }],
  // Application status - updated with Consider/Reject flow
  status: {
    type: String,
    enum: ['new', 'under_review', 'considered', 'rejected', 'shortlisted', 'interview', 'hired', 'spam'],
    default: 'new',
    index: true,
  },
  // Rejection reason
  rejectionReason: {
    type: String,
    default: '',
  },
  // HR assigned to review
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Notes and rating
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  hrNotes: {
    type: String,
    default: '',
  },
  // Labels/tags
  labels: [{
    type: String,
  }],
  // Internal communication
  replies: [{
    from: String, // 'hr' or 'candidate'
    message: String,
    sentAt: {
      type: Date,
      default: Date.now,
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  // Is read
  isRead: {
    type: Boolean,
    default: false,
  },
  // Is starred
  isStarred: {
    type: Boolean,
    default: false,
  },
  // Auto-reply sent
  autoReplySent: {
    type: Boolean,
    default: false,
  },
  // Source tracking
  source: {
    type: String,
    enum: ['email', 'website', 'referral', 'job_board'],
    default: 'email',
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
JobApplicationSchema.index({ companyId: 1, status: 1, createdAt: -1 });
JobApplicationSchema.index({ companyId: 1, isRead: 1, createdAt: -1 });
JobApplicationSchema.index({ fromEmail: 1 });

// UNIQUE INDEX: Prevent duplicate applications - Same email + Same jobId + Same company = NOT allowed
// Partial filter: only apply when jobId is present (allows multiple applications without jobId)
JobApplicationSchema.index(
  { fromEmail: 1, jobId: 1, companyId: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { jobId: { $exists: true, $ne: '' } },
    name: 'unique_email_jobId'
  }
);

const JobApplication = models.JobApplication || model('JobApplication', JobApplicationSchema);

export default JobApplication;
