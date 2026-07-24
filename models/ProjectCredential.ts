import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

// Encryption helpers
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

export const decrypt = (text: string): string => {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export interface ICredentialVersion {
  version: number;
  encryptedData: {
    username?: string;
    password?: string;
    apiKey?: string;
    secretKey?: string;
    accessToken?: string;
    notes?: string;
  };
  updatedBy: {
    _id: string;
    name: string;
    email: string;
  };
  updatedAt: Date;
  changeNotes?: string;
}

export interface IProjectCredential extends Document {
  projectId: mongoose.Types.ObjectId;
  service: string;
  environment: string;
  category: string;
  loginUrl?: string;
  username?: string;
  email?: string;
  encryptedPassword?: string;
  encryptedOtpSecret?: string;
  recoveryEmail?: string;
  recoveryPhone?: string;
  encryptedApiKey?: string;
  encryptedSecretKey?: string;
  encryptedAccessToken?: string;
  encryptedNotes?: string;
  tags: string[];
  isFavorite: boolean;
  expiryDate?: Date;
  lastUsed?: Date;
  usageHistory: Array<{
    userId: string;
    userName: string;
    action: 'view' | 'copy_password' | 'copy_api_key' | 'reveal';
    timestamp: Date;
  }>;
  versions: ICredentialVersion[];
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

const CredentialVersionSchema = new Schema<ICredentialVersion>({
  version: { type: Number, required: true },
  encryptedData: {
    username: String,
    password: String,
    apiKey: String,
    secretKey: String,
    accessToken: String,
    notes: String
  },
  updatedBy: {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  updatedAt: { type: Date, default: Date.now },
  changeNotes: String
});

const ProjectCredentialSchema = new Schema<IProjectCredential>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  service: { type: String, required: true },
  environment: { 
    type: String, 
    enum: ['Local', 'Development', 'QA', 'UAT', 'Staging', 'Production'],
    required: true
  },
  category: {
    type: String,
    enum: ['Environment', 'Login', 'Infrastructure', 'API', 'Database', 'Cloud', 'ThirdParty', 'Other'],
    default: 'Other'
  },
  loginUrl: String,
  username: String,
  email: String,
  encryptedPassword: String,
  encryptedOtpSecret: String,
  recoveryEmail: String,
  recoveryPhone: String,
  encryptedApiKey: String,
  encryptedSecretKey: String,
  encryptedAccessToken: String,
  encryptedNotes: String,
  tags: [{ type: String }],
  isFavorite: { type: Boolean, default: false },
  expiryDate: Date,
  lastUsed: Date,
  usageHistory: [{
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    action: { 
      type: String, 
      enum: ['view', 'copy_password', 'copy_api_key', 'reveal'],
      required: true 
    },
    timestamp: { type: Date, default: Date.now }
  }],
  versions: [CredentialVersionSchema],
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

ProjectCredentialSchema.index({ projectId: 1, environment: 1 });
ProjectCredentialSchema.index({ projectId: 1, category: 1 });
ProjectCredentialSchema.index({ projectId: 1, tags: 1 });
ProjectCredentialSchema.index({ projectId: 1, isFavorite: 1 });
ProjectCredentialSchema.index({ expiryDate: 1 });

export default mongoose.models.ProjectCredential || mongoose.model<IProjectCredential>('ProjectCredential', ProjectCredentialSchema);
