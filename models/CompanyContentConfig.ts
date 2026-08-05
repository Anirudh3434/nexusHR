import mongoose, { Schema, model, models } from 'mongoose';

export type EmailTemplateKey =
  | 'portal_access'
  | 'hired'
  | 'round_scheduled'
  | 'round_result'
  | 'offer_letter'
  | 'offer_response'
  | 'rejection'
  | 'password_reset';

export interface EmailTemplateOverride {
  subject: string;
  intro: string;
  body: string;
  closing: string;
  html?: string;
}

export const EMAIL_TEMPLATE_KEYS: EmailTemplateKey[] = [
  'portal_access',
  'hired',
  'round_scheduled',
  'round_result',
  'offer_letter',
  'offer_response',
  'rejection',
  'password_reset',
];

export interface CareersOverride {
  brandText: string;
  heroTitle: string;
  heroSubtitle: string;
  openPositionsTitle: string;
  openPositionsSubtitle: string;
  howToApplyTitle: string;
  applyOnlineTitle: string;
  applyOnlineDesc: string;
  applyEmailTitle: string;
  applyEmailDesc: string;
  footerBrandText: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headerColor: string;
  buttonColor: string;
  customHtml: string;
  customCss: string;
}

const TemplateOverrideSchema = new Schema({
  subject: { type: String, default: '' },
  intro: { type: String, default: '' },
  body: { type: String, default: '' },
  closing: { type: String, default: '' },
  html: { type: String, default: '' },
}, { _id: false });

const CompanyContentConfigSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true,
  },
  emailTemplates: {
    type: new Schema<Record<EmailTemplateKey, any>>({
      portal_access: TemplateOverrideSchema,
      hired: TemplateOverrideSchema,
      round_scheduled: TemplateOverrideSchema,
      round_result: TemplateOverrideSchema,
      offer_letter: TemplateOverrideSchema,
      offer_response: TemplateOverrideSchema,
      rejection: TemplateOverrideSchema,
      password_reset: TemplateOverrideSchema,
    }, { _id: false }),
    default: {},
  },
  careers: {
    brandText: { type: String, default: '' },
    heroTitle: { type: String, default: '' },
    heroSubtitle: { type: String, default: '' },
    openPositionsTitle: { type: String, default: '' },
    openPositionsSubtitle: { type: String, default: '' },
    howToApplyTitle: { type: String, default: '' },
    applyOnlineTitle: { type: String, default: '' },
    applyOnlineDesc: { type: String, default: '' },
    applyEmailTitle: { type: String, default: '' },
    applyEmailDesc: { type: String, default: '' },
    footerBrandText: { type: String, default: '' },
    primaryColor: { type: String, default: '' },
    secondaryColor: { type: String, default: '' },
    accentColor: { type: String, default: '' },
    backgroundColor: { type: String, default: '' },
    textColor: { type: String, default: '' },
    headerColor: { type: String, default: '' },
    buttonColor: { type: String, default: '' },
    customHtml: { type: String, default: '' },
    customCss: { type: String, default: '' },
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

const CompanyContentConfig = models.CompanyContentConfig || model('CompanyContentConfig', CompanyContentConfigSchema);

export default CompanyContentConfig;
