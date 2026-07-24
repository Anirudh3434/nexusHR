import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectOnboarding extends Document {
  projectId: mongoose.Types.ObjectId;
  projectOverview: {
    businessPurpose: string;
    architectureOverview: string;
    techStack: string[];
  };
  development: {
    folderStructure: string;
    developmentWorkflow: string;
    localSetupGuide: string;
    installationSteps: string[];
    requiredTools: string[];
    codingStandards: string;
  };
  git: {
    branchStrategy: string;
    pullRequestProcess: string;
  };
  deployment: {
    deploymentProcess: string;
    testingProcess: string;
    releaseProcess: string;
  };
  team: {
    importantContacts: string;
    teamMembers: Array<{
      userId: string;
      name: string;
      role: string;
      email: string;
    }>;
  };
  documentation: {
    faqs: Array<{
      question: string;
      answer: string;
    }>;
    knownIssues: Array<{
      issue: string;
      solution: string;
    }>;
    troubleshootingGuide: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  lastUpdatedBy: {
    _id: string;
    name: string;
    email: string;
  };
  version: number;
  versions: Array<{
    version: number;
    changes: string;
    updatedBy: {
      _id: string;
      name: string;
      email: string;
    };
    updatedAt: Date;
  }>;
  comments: Array<{
    _id: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectOnboardingSchema = new Schema<IProjectOnboarding>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  projectOverview: {
    businessPurpose: { type: String, default: '' },
    architectureOverview: { type: String, default: '' },
    techStack: [{ type: String, default: '' }]
  },
  development: {
    folderStructure: { type: String, default: '' },
    developmentWorkflow: { type: String, default: '' },
    localSetupGuide: { type: String, default: '' },
    installationSteps: [{ type: String, default: '' }],
    requiredTools: [{ type: String, default: '' }],
    codingStandards: { type: String, default: '' }
  },
  git: {
    branchStrategy: { type: String, default: '' },
    pullRequestProcess: { type: String, default: '' }
  },
  deployment: {
    deploymentProcess: { type: String, default: '' },
    testingProcess: { type: String, default: '' },
    releaseProcess: { type: String, default: '' }
  },
  team: {
    importantContacts: { type: String, default: '' },
    teamMembers: [{
      userId: { type: String },
      name: { type: String },
      role: { type: String },
      email: { type: String }
    }]
  },
  documentation: {
    faqs: [{
      question: { type: String },
      answer: { type: String }
    }],
    knownIssues: [{
      issue: { type: String },
      solution: { type: String }
    }],
    troubleshootingGuide: { type: String, default: '' }
  },
  createdBy: {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  lastUpdatedBy: {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  version: { type: Number, default: 1 },
  versions: [{
    version: { type: Number, required: true },
    changes: { type: String, required: true },
    updatedBy: {
      _id: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true }
    },
    updatedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.ProjectOnboarding || mongoose.model<IProjectOnboarding>('ProjectOnboarding', ProjectOnboardingSchema);
