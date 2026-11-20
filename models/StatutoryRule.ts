import mongoose, { Schema, model, models } from 'mongoose';

/**
 * Layer 1: Global Versioned Statutory Rules (super_admin only)
 * 
 * Captures official Government of India notifications and statutory parameters:
 * - EPFO notifications (G.S.R. 608(E), S.O. 5109(E))
 * - ESIC notifications (G.S.R. 959(E), G.S.R. 423(E))
 * - Code on Wages wage definitions (S.O. 5322(E))
 * - Income-tax Act transitions (1961 vs 2025)
 */
export interface IStatutoryRule {
  ruleType: 'PF' | 'ESI' | 'PT' | 'TDS' | 'WAGE_DEF';
  version: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  notificationNumber: string;
  notificationDate: Date;
  sourceUrl: string;
  parameters: Record<string, any>;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
}

const StatutoryRuleSchema = new Schema<IStatutoryRule>({
  ruleType: {
    type: String,
    enum: ['PF', 'ESI', 'PT', 'TDS', 'WAGE_DEF'],
    required: true,
    index: true,
  },
  version: {
    type: String,
    required: true,
    index: true,
  },
  effectiveFrom: {
    type: Date,
    required: true,
    index: true,
  },
  effectiveTo: {
    type: Date,
    default: null,
  },
  notificationNumber: {
    type: String,
    required: true,
  },
  notificationDate: {
    type: Date,
    required: true,
  },
  sourceUrl: {
    type: String,
    required: true,
  },
  parameters: {
    type: Schema.Types.Mixed,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

StatutoryRuleSchema.index({ ruleType: 1, effectiveFrom: -1, isActive: 1 });

const StatutoryRule = models.StatutoryRule || model<IStatutoryRule>('StatutoryRule', StatutoryRuleSchema);

export default StatutoryRule;
