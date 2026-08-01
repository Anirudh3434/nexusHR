import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'hr', 'manager', 'employee'],
    default: 'employee',
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company linkage is required'],
  },
  // Profile Information (Editable)
  dob: {
    type: Date,
  },
  phone: {
    type: String,
  },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'India' },
  },
  bio: {
    type: String,
    maxlength: 500,
  },
  // Social Links (Editable)
  github: {
    type: String,
  },
  linkedin: {
    type: String,
  },
  website: {
    type: String,
  },
  twitter: {
    type: String,
  },
  // Professional Info (Non-editable via profile)
  employeeId: {
    type: String,
    unique: true,
  },
  department: {
    type: String,
  },
  designation: {
    type: String,
  },
  joiningDate: {
    type: Date,
  },
  salary: {
    type: Number,
  },
  workShiftId: {
    type: Schema.Types.ObjectId,
    ref: 'WorkShift',
  },
  // Leave balances - stores { leaveTypeId: { allocated: number, used: number } }
  leaveBalances: {
    type: Map,
    of: new Schema({
      allocated: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      remaining: { type: Number, default: 0 },
    }),
    default: {},
  },
  // System fields
  avatar: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Temporary/temp-created portal accounts must set their own password at first login
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
  // Job applicant portal accounts land in the separate /candidate portal, not the employee dashboard
  isCandidate: {
    type: Boolean,
    default: false,
  },
  // Geo-fencing exemptions
  isGeoFencingExempt: {
    type: Boolean,
    default: false,
  },
  geoFencingExemptUntil: {
    type: Date,
  },
  // Overtime Handling
  overtimePreference: {
    type: String,
    enum: ['payroll', 'leave'],
    default: 'payroll',
  },
  compOffBalance: {
    type: Number, // Stores total OT hours converted to leave
    default: 0,
  },
}, {
  timestamps: true,
});

// Force refresh the model in development to ensure new fields are caught
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.User;
}

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
