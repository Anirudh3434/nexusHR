import mongoose, { Schema, model, models } from 'mongoose';

const LeaveTypeSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  name: {
    type: String, // e.g., Paid Leave, Casual Leave, Sick Leave
    required: true,
  },
  code: {
    type: String, // e.g., PL, CL, SL
    required: true,
  },
  description: {
    type: String,
  },
  defaultDays: {
    type: Number, // Default days per year
    default: 0,
  },
  isPaid: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  color: {
    type: String, // For UI display
    default: '#3B82F6',
  },
}, {
  timestamps: true,
});

const LeaveType = models.LeaveType || model('LeaveType', LeaveTypeSchema);

export default LeaveType;
