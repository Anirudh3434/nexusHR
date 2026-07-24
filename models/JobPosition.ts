import mongoose, { Schema, Document } from 'mongoose';

export interface IJobPosition extends Document {
  companyId: mongoose.Types.ObjectId;
  jobId: string; // Unique job ID like JB0001
  title: string;
  department: string;
  designation: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  experienceRequired: string;
  salaryRange: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  openings: number;
  status: 'Active' | 'Closed' | 'On Hold';
  postedAt: Date;
  closesAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobPositionSchema = new Schema<IJobPosition>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  jobId: {
    type: String,
    unique: true,
    sparse: true,
  },
  title: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  designation: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: 'Remote',
  },
  description: {
    type: String,
    required: true,
  },
  requirements: [{
    type: String,
  }],
  responsibilities: [{
    type: String,
  }],
  experienceRequired: {
    type: String,
    default: '0-2 years',
  },
  salaryRange: {
    type: String,
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    default: 'Full-time',
  },
  openings: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ['Active', 'Closed', 'On Hold'],
    default: 'Active',
  },
  postedAt: {
    type: Date,
    default: Date.now,
  },
  closesAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
JobPositionSchema.index({ companyId: 1, status: 1, postedAt: -1 });
JobPositionSchema.index({ jobId: 1 });

export default mongoose.models.JobPosition || mongoose.model<IJobPosition>('JobPosition', JobPositionSchema);
