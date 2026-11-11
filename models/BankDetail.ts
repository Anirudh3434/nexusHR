import mongoose, { Schema, Document } from 'mongoose';

export interface IBankDetail extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  encryptedDetails: string; // AES-256-GCM iv:authTag:encryptedHex
  bankName: string;
  accountHolderName: string;
  accountNumberMasked: string;
  ifscCode: string;
  branchName?: string;
  upiIdMasked?: string;
  blindIndexBank?: string;
  isVerified: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BankDetailSchema = new Schema<IBankDetail>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    // AES-256-GCM Encrypted JSON storing raw accountNumber, ifscCode, bankName, accountHolderName, etc.
    encryptedDetails: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    accountNumberMasked: {
      type: String,
      required: true,
      trim: true,
    },
    ifscCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    branchName: {
      type: String,
      trim: true,
    },
    upiIdMasked: {
      type: String,
      trim: true,
    },
    blindIndexBank: {
      type: String,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent caching issues in dev hot-reload
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).BankDetail;
}

const BankDetail = mongoose.models.BankDetail || mongoose.model<IBankDetail>('BankDetail', BankDetailSchema);

export default BankDetail;

