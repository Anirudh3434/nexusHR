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
    default: '#0f766e',
  },
  secondaryColor: {
    type: String,
    default: null,
  },
  // Which strategy wins when applying the company theme.
  // "logo" = keep colors in sync with the uploaded logo, "custom" = the
  // admin picked colors manually, "default" = product Harbor & Pine palette.
  themeSource: {
    type: String,
    enum: ['default', 'logo', 'custom'],
    default: 'default',
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
