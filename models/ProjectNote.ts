import mongoose, { Schema, Document } from 'mongoose';

export interface INoteVersion {
  version: number;
  content: string;
  editedBy: {
    _id: string;
    name: string;
    email: string;
  };
  editedAt: Date;
  changeNotes?: string;
}

export interface IProjectNote extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  tags: string[];
  category: string;
  isPinned: boolean;
  isFavorite: boolean;
  versions: INoteVersion[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  lastEditedBy: {
    _id: string;
    name: string;
    email: string;
  };
  comments: Array<{
    _id: string;
    userId: string;
    userName: string;
    content: string;
    mentions: string[];
    createdAt: Date;
  }>;
  viewHistory: Array<{
    userId: string;
    userName: string;
    viewedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const NoteVersionSchema = new Schema<INoteVersion>({
  version: { type: Number, required: true },
  content: { type: String, required: true },
  editedBy: {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  editedAt: { type: Date, default: Date.now },
  changeNotes: String
});

const ProjectNoteSchema = new Schema<IProjectNote>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: [{ type: String }],
  category: { 
    type: String, 
    enum: ['Deployment', 'Coding', 'Issues', 'Guidelines', 'Decisions', 'Meeting', 'Release', 'Sprint', 'TODO', 'FAQ', 'Other'],
    default: 'Other'
  },
  isPinned: { type: Boolean, default: false },
  isFavorite: { type: Boolean, default: false },
  versions: [NoteVersionSchema],
  createdBy: {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  lastEditedBy: {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  comments: [{
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    content: { type: String, required: true },
    mentions: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
  }],
  viewHistory: [{
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    viewedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProjectNoteSchema.index({ projectId: 1, isPinned: -1, updatedAt: -1 });
ProjectNoteSchema.index({ projectId: 1, isFavorite: -1 });
ProjectNoteSchema.index({ projectId: 1, tags: 1 });
ProjectNoteSchema.index({ projectId: 1, category: 1 });

export default mongoose.models.ProjectNote || mongoose.model<IProjectNote>('ProjectNote', ProjectNoteSchema);
