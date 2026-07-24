import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectDocumentVersion {
  version: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  uploadedAt: Date;
  changeNotes?: string;
}

export interface IProjectDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  notes?: string;
  tags: string[];
  category: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  version: number;
  versions: IProjectDocumentVersion[];
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  lastModifiedBy?: {
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
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectDocumentVersionSchema = new Schema<IProjectDocumentVersion>({
  version: { type: Number, required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedBy: {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  uploadedAt: { type: Date, default: Date.now },
  changeNotes: String
});

const ProjectDocumentSchema = new Schema<IProjectDocument>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: String,
  notes: String,
  tags: [{ type: String }],
  category: { 
    type: String, 
    enum: ['PRD', 'BRD', 'Technical', 'API', 'Architecture', 'Database', 'Design', 'Setup', 'Deployment', 'Manual', 'SOP', 'Meeting', 'Release', 'Testing', 'Plan', 'Other'],
    default: 'Other'
  },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  version: { type: Number, default: 1 },
  versions: [ProjectDocumentVersionSchema],
  uploadedBy: {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  lastModifiedBy: {
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
  isFavorite: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProjectDocumentSchema.index({ projectId: 1, isDeleted: 1 });
ProjectDocumentSchema.index({ projectId: 1, category: 1 });
ProjectDocumentSchema.index({ projectId: 1, tags: 1 });
ProjectDocumentSchema.index({ projectId: 1, isFavorite: 1 });

export default mongoose.models.ProjectDocument || mongoose.model<IProjectDocument>('ProjectDocument', ProjectDocumentSchema);
