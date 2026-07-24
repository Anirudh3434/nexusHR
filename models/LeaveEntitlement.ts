import mongoose, { Schema, model, models } from 'mongoose';

// Leave entitlement based on experience tiers
const LeaveEntitlementSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  leaveTypeId: {
    type: Schema.Types.ObjectId,
    ref: 'LeaveType',
    required: true,
  },
  // Experience tier
  minYears: {
    type: Number, // Minimum years of service
    default: 0,
  },
  maxYears: {
    type: Number, // Maximum years of service (null = unlimited)
    default: null,
  },
  tierName: {
    type: String, // e.g., "0-2 Years", "2-5 Years", "5+ Years"
    required: true,
  },
  // Days allocated for this tier
  daysPerYear: {
    type: Number,
    required: true,
  },
  // Accrual settings
  accrualType: {
    type: String,
    enum: ['yearly', 'monthly', 'quarterly'],
    default: 'yearly',
  },
  canCarryForward: {
    type: Boolean,
    default: true,
  },
  maxCarryForwardDays: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const LeaveEntitlement = models.LeaveEntitlement || model('LeaveEntitlement', LeaveEntitlementSchema);

export default LeaveEntitlement;
