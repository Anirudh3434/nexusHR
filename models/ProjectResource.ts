import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectResource extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  url: string;
  description?: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  viewHistory: Array<{
    userId: string;
    userName: string;
    viewedAt: Date;
  }>;
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

const ProjectResourceSchema = new Schema<IProjectResource>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ['Git', 'Design', 'ProjectManagement', 'API', 'Documentation', 'CI/CD', 'Monitoring', 'Hosting', 'Cloud', 'Domain', 'Other'],
    default: 'Other'
  },
  tags: [{ type: String }],
  isFavorite: { type: Boolean, default: false },
  viewHistory: [{
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    viewedAt: { type: Date, default: Date.now }
  }],
  createdBy: {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  lastUpdatedBy: {
    _id: String,
    name: String,
    email: String
  },
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

ProjectResourceSchema.index({ projectId: 1, category: 1 });
ProjectResourceSchema.index({ projectId: 1, tags: 1 });
ProjectResourceSchema.index({ projectId: 1, isFavorite: 1 });

export default mongoose.models.ProjectResource || mongoose.model<IProjectResource>('ProjectResource', ProjectResourceSchema);
