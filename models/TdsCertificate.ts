import mongoose, { Schema, model, models } from 'mongoose';

export type TdsCertificateType = 'FORM_16' | 'FORM_130';
export type TdsCertificateQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ANNUAL';
export type TdsCertificatePart = 'PART_A' | 'PART_B' | 'COMBINED';

const TdsCertificateSchema = new Schema({
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
  financialYear: {
    type: String, // e.g. "2026-27"
    required: true,
    index: true,
  },
  assessmentYear: {
    type: String, // e.g. "2027-28"
    required: true,
  },
  certificateType: {
    type: String,
    enum: ['FORM_16', 'FORM_130'],
    required: true,
  },
  quarter: {
    type: String,
    enum: ['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'],
    default: 'ANNUAL',
  },
  part: {
    type: String,
    enum: ['PART_A', 'PART_B', 'COMBINED'],
    default: 'COMBINED',
  },
  fileName: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  mimeType: {
    type: String,
    default: 'application/pdf',
  },
  tracesCertificateNumber: {
    type: String,
    trim: true,
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  isVerified: {
    type: Boolean,
    default: true,
  },
  disclaimerAcknowledged: {
    type: Boolean,
    default: true,
    required: true,
    // Confirms this is an official certificate issued by TRACES, not generated locally
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

TdsCertificateSchema.index(
  { employeeId: 1, financialYear: 1, certificateType: 1, part: 1, quarter: 1 },
  { unique: true }
);

const TdsCertificate = models.TdsCertificate || model('TdsCertificate', TdsCertificateSchema);

export default TdsCertificate;
