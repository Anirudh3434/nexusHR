import mongoose, { Schema, model, models } from 'mongoose';

// Employee Onboarding module
// One record per new hire. Tracks offer letter, document collection and
// a cross-department checklist (HR / IT / Admin / Manager / Employee).
const OnboardingSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  // Linked user account (created at onboarding time so the new hire can log in
  // for self-service: upload documents, accept offer, complete own tasks).
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  // New hire / candidate information
  candidate: {
    fullName: { type: String, required: [true, 'Full name is required'] },
    email: { type: String, required: [true, 'Email is required'], lowercase: true },
    phone: { type: String, default: '' },
    position: { type: String, default: '' },
    department: { type: String, default: '' },
    reportingManager: { type: String, default: '' },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      default: 'Full-time',
    },
    joiningDate: { type: Date },
    workLocation: { type: String, default: '' },
    source: { type: String, default: 'manual' },
  },
  // Offer letter
  offerLetter: {
    content: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'declined'],
      default: 'draft',
    },
    ctc: { type: String, default: '' },
    probationMonths: { type: Number, default: 3 },
    sentAt: { type: Date },
    respondedAt: { type: Date },
    responseNotes: { type: String, default: '' },
    generatedBy: {
      _id: String,
      name: String,
      email: String,
    },
    generatedAt: { type: Date },
  },
  // Required documents to be collected from the new hire
  documents: [{
    _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['identity', 'bank', 'education', 'employment', 'photo', 'other'],
      default: 'other',
    },
    isRequired: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'rejected'],
      default: 'pending',
    },
    fileUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    submittedBy: { _id: String, name: String },
    submittedAt: { type: Date },
    verifiedBy: { _id: String, name: String },
    verifiedAt: { type: Date },
    remarks: { type: String, default: '' },
  }],
  // Onboarding checklist / task assignment to departments
  checklist: [{
    _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['HR', 'IT', 'Admin', 'Manager', 'Employee'],
      default: 'HR',
    },
    assigneeRole: {
      type: String,
      enum: ['hr', 'it', 'admin', 'manager', 'employee'],
      default: 'hr',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    completedBy: { _id: String, name: String },
    completedAt: { type: Date },
    notes: { type: String, default: '' },
    autoTask: { type: Boolean, default: false },
  }],
  // Overall onboarding status
  status: {
    type: String,
    enum: ['draft', 'offer_sent', 'offer_accepted', 'in_progress', 'completed', 'offer_declined', 'cancelled'],
    default: 'draft',
    index: true,
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  notes: { type: String, default: '' },
  createdBy: { _id: String, name: String, email: String },
  lastUpdatedBy: { _id: String, name: String, email: String },
  activity: [{
    _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    userId: String,
    userName: String,
    action: String,
    details: String,
    createdAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

// Unique active onboarding per candidate email + company
OnboardingSchema.index({ companyId: 1, 'candidate.email': 1 }, {
  unique: true,
  partialFilterExpression: { status: { $nin: ['cancelled', 'offer_declined'] } },
  name: 'unique_active_onboarding_email',
});

OnboardingSchema.index({ companyId: 1, status: 1, createdAt: -1 });

export default models.Onboarding || model('Onboarding', OnboardingSchema);
