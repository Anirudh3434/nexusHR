import mongoose, { Schema, model, models } from 'mongoose';

/**
 * Platform administrators — stored SEPARATELY from company users.
 * These accounts administer all tenants via /super-admin and never
 * belong to a company. Never query this collection with a companyId.
 */
const SuperAdminSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: true, // force rotation of the initial credential
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const SuperAdmin = models.SuperAdmin || model('SuperAdmin', SuperAdminSchema);

export default SuperAdmin;
