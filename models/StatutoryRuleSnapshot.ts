import mongoose, { Schema, model, models } from 'mongoose';

/**
 * Immutable Statutory Rule Snapshot
 * 
 * Locked per company per payroll period.
 * Exports (PF ECR, ESIC, Form 138, PT) and re-runs MUST read this snapshot
 * to guarantee that retroactive or future configuration changes never alter past filings.
 */
export interface IStatutoryRuleSnapshot {
  companyId: mongoose.Types.ObjectId;
  month: number; // 0-11
  year: number;
  effectiveDate: Date;
  resolvedRules: {
    pf: {
      enabled: boolean;
      establishmentCode: string;
      ceiling: number;
      employeeRate: number;
      epsRate: number;
      epfEmployerRate: number;
      edliRate: number;
      adminRate: number;
      maxEmployeePf: number;
      maxEmployerEps: number;
      maxEmployerEpf: number;
      wageCeilingMode: 'statutory_ceiling' | 'actual_wages';
      employerShareInCtc: boolean;
      isSplitMonth: boolean;
    };
    esi: {
      enabled: boolean;
      establishmentCode: string;
      threshold: number;
      employeeRate: number;
      employerRate: number;
      enforceContributionPeriod: boolean;
    };
    pt: {
      enabled: boolean;
      stateRegistrations: Array<{ state: string; registrationNumber: string; ptoCircle?: string }>;
    };
    tax: {
      tanNumber: string;
      act: '1961' | '2025';
      defaultRegime: 'new' | 'old';
    };
    general: {
      roundingMode: 'round' | 'floor';
    };
  };
  checksum: string; // SHA-256 hash of resolvedRules
  isLocked: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StatutoryRuleSnapshotSchema = new Schema<IStatutoryRuleSnapshot>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  month: {
    type: Number,
    required: true,
    min: 0,
    max: 11,
  },
  year: {
    type: Number,
    required: true,
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  resolvedRules: {
    type: Schema.Types.Mixed,
    required: true,
  },
  checksum: {
    type: String,
    required: true,
  },
  isLocked: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Ensure only one snapshot per company per month/year
StatutoryRuleSnapshotSchema.index({ companyId: 1, year: 1, month: 1 }, { unique: true });

const StatutoryRuleSnapshot = models.StatutoryRuleSnapshot || model<IStatutoryRuleSnapshot>('StatutoryRuleSnapshot', StatutoryRuleSnapshotSchema);

export default StatutoryRuleSnapshot;
