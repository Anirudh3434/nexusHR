import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectAutoComment extends Document {
  projectId: mongoose.Types.ObjectId;
  fromStatus: string;
  toStatus: string;
  template: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectAutoCommentSchema = new Schema<IProjectAutoComment>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      required: true,
      default: 'any',
    },
    toStatus: {
      type: String,
      required: true,
      default: 'any',
    },
    template: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ProjectAutoComment || mongoose.model<IProjectAutoComment>('ProjectAutoComment', ProjectAutoCommentSchema);
