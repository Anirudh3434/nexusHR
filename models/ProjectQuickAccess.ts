import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectQuickAccess extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectQuickAccessSchema = new Schema<IProjectQuickAccess>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
}, { timestamps: true });

ProjectQuickAccessSchema.index({ projectId: 1 });

export default mongoose.models.ProjectQuickAccess || mongoose.model<IProjectQuickAccess>('ProjectQuickAccess', ProjectQuickAccessSchema);
