import mongoose, { Schema, model, models } from 'mongoose';

const SettingsSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true,
  },
  // Branding
  logo: {
    type: String, // URL to logo image
    default: null,
  },
  loginBackground: {
    type: String, // URL to background image
    default: null,
  },
  loginBackgroundColor: {
    type: String,
    default: '#ffffff',
  },
  primaryColor: {
    type: String,
    default: '#2563eb', // blue-600
  },
  // Login Page Text
  loginTitle: {
    type: String,
    default: 'Welcome Back',
  },
  loginSubtitle: {
    type: String,
    default: 'Sign in to your account',
  },
  // Updated by
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

const Settings = models.Settings || model('Settings', SettingsSchema);

export default Settings;
