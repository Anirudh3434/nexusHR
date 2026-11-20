import mongoose, { Schema, model, models } from 'mongoose';

const CompanySchema = new Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
  },
  code: {
    type: String,
    unique: true,
    required: [true, 'Company code is required'],
  },
  email: {
    type: String,
    required: [true, 'Company email is required'],
  },
  phone: {
    type: String,
  },
  website: {
    type: String,
  },
  // Address Information
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'India' },
  },
  // GST/Tax Information
  gstNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  panNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  // Geo-fencing Configuration
  officeLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String },
  },
  geoFenceRadius: {
    type: Number,
    default: 100, // Default 100 meters radius
    min: 10,
    max: 5000,
  },
  enableGeoFencing: {
    type: Boolean,
    default: true,
  },
  // Branding
  logo: {
    type: String, // URL to stored logo
  },
  // Subscription & trial (1-month free trial from company creation)
  trialStartsAt: {
    type: Date,
  },
  trialEndsAt: {
    type: Date,
  },
  subscriptionStatus: {
    type: String,
    enum: ['trial', 'active', 'expired'],
    default: 'trial',
  },
  subscriptionPlan: {
    type: String, // starter | growth | enterprise (placeholder billing)
  },
  subscribedAt: {
    type: Date,
  },
  subscriptionEndsAt: {
    type: Date,
  },
  // Company Settings
  isActive: {
    type: Boolean,
    default: true,
  },
  onboardingComplete: {
    type: Boolean,
    default: false,
  },
  registrationStep: {
    type: Number,
    default: 1, // Tracks current step in onboarding (1-4)
  },
  // Work Settings
  workHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' },
    workDays: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
  },
  payrollCycleDate: {
    type: Number,
    default: 28,
    min: 1,
    max: 31,
  },
  overtimeRate: {
    type: Number,
    default: 1.5,
    min: 1,
    max: 5,
  },
  // RazorpayX Business Banking & Payroll Payouts Configuration
  razorpayxConfig: {
    enabled: {
      type: Boolean,
      default: false,
    },
    keyId: {
      type: String,
      trim: true,
    },
    keySecretEncrypted: {
      type: String, // AES-256-GCM encrypted
    },
    accountNumber: {
      type: String, // Source RazorpayX business banking account number (e.g. 7878780080316316)
      trim: true,
    },
    // Legacy plaintext field. New values are written to webhookSecretEncrypted.
    webhookSecret: {
      type: String,
      trim: true,
    },
    webhookSecretEncrypted: {
      type: String, // AES-256-GCM encrypted
    },
    defaultMode: {
      type: String,
      enum: ['IMPS', 'NEFT', 'RTGS', 'UPI'],
      default: 'IMPS',
    },
  },
  // Layer 2: Company Statutory Settings & Registration Numbers
  statutoryConfig: {
    pf: {
      enabled: { type: Boolean, default: true },
      establishmentCode: { type: String, trim: true, default: '' },
      wageCeilingMode: { 
        type: String, 
        enum: ['statutory_ceiling', 'actual_wages'], 
        default: 'statutory_ceiling' 
      },
      componentsIncluded: { 
        type: [String], 
        default: ['basic', 'da'] 
      },
      employerShareInCtc: { type: Boolean, default: true },
      epsEdliBasis: { 
        type: String, 
        enum: ['statutory_ceiling', 'actual_wages'], 
        default: 'statutory_ceiling' 
      },
      newJoinerAboveCeiling: { 
        type: String, 
        enum: ['mandatory_opt_in', 'allow_opt_out'], 
        default: 'allow_opt_out' 
      },
    },
    esi: {
      enabled: { type: Boolean, default: true },
      establishmentCode: { type: String, trim: true, default: '' },
      threshold: { type: Number, default: 21000 },
      componentsIncluded: { 
        type: [String], 
        default: ['basic', 'hra', 'da', 'specialAllowance', 'conveyance', 'medical'] 
      },
      enforceContributionPeriod: { type: Boolean, default: true },
    },
    pt: {
      enabled: { type: Boolean, default: true },
      stateRegistrations: [{
        state: { type: String, required: true },
        registrationNumber: { type: String, required: true },
        ptoCircle: { type: String, default: '' },
      }],
    },
    tax: {
      tanNumber: { type: String, trim: true, default: '' },
      defaultRegime: { type: String, enum: ['new', 'old'], default: 'new' },
    },
    general: {
      roundingMode: { type: String, enum: ['round', 'floor'], default: 'round' },
      effectiveDate: { type: Date, default: Date.now },
      lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
  },
}, {
  timestamps: true,
});

const Company = models.Company || model('Company', CompanySchema);

export default Company;
