import {
  EmailTemplateKey,
  EmailTemplateOverride,
  CareersOverride,
} from '@/models/CompanyContentConfig';

export interface EmailTemplateMeta {
  key: EmailTemplateKey;
  name: string;
  description: string;
  event: string;
  sample: {
    subject: string;
    intro: string;
    body: string;
    closing: string;
  };
}

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplateOverride> = {
  portal_access: {
    subject: 'Welcome to {companyName} — Your candidate portal access',
    intro: 'Congratulations on being selected for the position of {position}! Your application has been approved and your onboarding has been initiated.',
    body: 'We have created a temporary account for you on the Candidate Portal where you can track your application status, interview rounds, offer letter and complete your onboarding tasks.',
    closing: 'Use your email address and the temporary password provided to log in. We recommend changing your password after your first login.',
    html: '',
  },
  hired: {
    subject: 'Congratulations — {position} at {companyName}!',
    intro: 'Congratulations! We are delighted to confirm that you have been selected for the position of {position} at {companyName}.',
    body: 'Your offer letter and onboarding tasks are now available on the candidate portal. Log in with the same credentials you used to track your application.',
    closing: '',
    html: '',
  },
  round_scheduled: {
    subject: 'Interview scheduled — {roundName} for {position}',
    intro: 'A new interview round has been scheduled for your application to {position} at {companyName}.',
    body: 'Track your application status and round results anytime on the candidate portal.',
    closing: '',
    html: '',
  },
  round_result: {
    subject: 'Great news — you cleared {roundName}!',
    intro: 'Congratulations! You have cleared the {roundName} round for the {position} position at {companyName}.',
    body: 'We will be in touch shortly with the next steps. You can also track your application status on the candidate portal.',
    closing: '',
    html: '',
  },
  offer_letter: {
    subject: 'Offer Letter — {position} at {companyName}',
    intro: 'We are pleased to share your offer letter for the position of {position} at {companyName}. Please review the details below and accept or decline the offer through the candidate portal.',
    body: '',
    closing: '',
    html: '',
  },
  offer_response: {
    subject: '{candidateName} accepted the offer for {position}',
    intro: '{candidateName} has accepted the offer for the position of {position} at {companyName}.',
    body: '',
    closing: '',
    html: '',
  },
  rejection: {
    subject: 'Update on your application — {position} at {companyName}',
    intro: 'Thank you for applying for the {position} position at {companyName}. After careful review, we have decided not to move forward with your application at this time.',
    body: 'We appreciate the time and effort you invested and encourage you to apply for future opportunities.',
    closing: '',
    html: '',
  },
  password_reset: {
    subject: 'Your {companyName} portal password has been reset',
    intro: 'Your temporary password has been reset. Use the new password provided to log in to the candidate portal.',
    body: '',
    closing: '',
    html: '',
  },
};

export const CAREER_COLOR_FIELDS = [
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'backgroundColor',
  'textColor',
  'headerColor',
  'buttonColor',
] as const;

export const DEFAULT_CAREERS: CareersOverride = {
  brandText: 'WE MADE CAREERS',
  heroTitle: 'Join Our Team',
  heroSubtitle: 'We believe in nurturing talent and creating opportunities for growth. Explore our open positions and take the next step in your career journey.',
  openPositionsTitle: 'Open Positions',
  openPositionsSubtitle: 'Browse our current job openings and apply today',
  howToApplyTitle: 'How to Apply',
  applyOnlineTitle: 'Apply Online',
  applyOnlineDesc: 'Click "Apply Online" on any job posting and fill out the application form with your details and resume.',
  applyEmailTitle: 'Apply via Email',
  applyEmailDesc: 'Send your resume and cover letter to {careerEmail} with the Job ID in the subject line.',
  footerBrandText: 'WE MADE CAREERS',
  primaryColor: '#0f172a',
  secondaryColor: '#475569',
  accentColor: '#2563eb',
  backgroundColor: '#f8fafc',
  textColor: '#64748b',
  headerColor: '#ffffff',
  buttonColor: '#0f172a',
  customHtml: '',
  customCss: '',
};

export const EMAIL_TEMPLATE_LIST: EmailTemplateMeta[] = [
  { key: 'portal_access', name: 'Portal Access', description: 'Sent when a candidate portal account is created', event: 'Candidate shortlisted / portal created', sample: { subject: 'Welcome to NexusHR — Your candidate portal access', intro: 'Hi {name}, congratulations on being selected for {position}! Your onboarding has been initiated.', body: 'Log in to track your application, interview rounds and offer letter.', closing: '' } },
  { key: 'hired', name: 'Hired', description: 'Sent when a candidate is hired', event: 'Candidate marked hired', sample: { subject: 'Congratulations — you are hired!', intro: 'Hi {name}, we are delighted to confirm you have been selected for {position}.', body: 'Your offer letter and onboarding tasks are ready on the portal.', closing: '' } },
  { key: 'round_scheduled', name: 'Interview Scheduled', description: 'Sent when an interview round is scheduled', event: 'Round scheduled', sample: { subject: 'Interview scheduled — Technical Round', intro: 'Hi {name}, a new interview round has been scheduled for {position}.', body: 'Track your round details on the candidate portal.', closing: '' } },
  { key: 'round_result', name: 'Round Result', description: 'Sent when a round is passed or failed', event: 'Round result decided', sample: { subject: 'Great news — you cleared the round!', intro: 'Hi {name}, you have cleared the {roundName} round for {position}.', body: 'We will be in touch shortly with the next steps.', closing: '' } },
  { key: 'offer_letter', name: 'Offer Letter', description: 'Sent with the generated offer letter', event: 'Offer letter sent', sample: { subject: 'Offer Letter — {position}', intro: 'Hi {name}, please review your offer letter for {position}.', body: '', closing: '' } },
  { key: 'offer_response', name: 'Offer Response (to HR)', description: 'Notification to HR when a candidate accepts/declines', event: 'Candidate responds to offer', sample: { subject: 'Candidate accepted the offer', intro: 'Candidate has accepted the offer for {position}.', body: '', closing: '' } },
  { key: 'rejection', name: 'Rejection', description: 'Sent when an application is rejected', event: 'Application rejected', sample: { subject: 'Update on your application', intro: 'Hi {name}, after careful review we have decided not to move forward.', body: 'We encourage you to apply for future opportunities.', closing: '' } },
  { key: 'password_reset', name: 'Password Reset', description: 'Sent with a new temporary password', event: 'Password reset', sample: { subject: 'Your portal password has been reset', intro: 'Hi {name}, your temporary password has been reset.', body: '', closing: '' } },
];

export function fillTemplateText(text: string, vars: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (vars[key] !== undefined && vars[key] !== null && vars[key] !== '') return vars[key];
    return match;
  });
}

export function renderEmailPreview(
  template: EmailTemplateOverride,
  vars: Record<string, string>
): { subject: string; html: string } {
  const subject = fillTemplateText(template.subject || '', vars);

  // If a custom HTML body is provided, show a document-ish preview of it.
  if (template.html && template.html.trim()) {
    const custom = fillTemplateText(template.html, vars);
    return {
      subject,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <p style="margin:0;padding:2px 10px;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:600;text-align:center;text-transform:uppercase;letter-spacing:0.05em;">Custom HTML Template</p>
          ${custom}
        </div>
      `,
    };
  }

  const intro = fillTemplateText(template.intro || '', vars);
  const body = fillTemplateText(template.body || '', vars);
  const closing = fillTemplateText(template.closing || '', vars);

  const content = `
    ${intro ? `<p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;">${escapeHtml(intro)}</p>` : ''}
    ${body ? `<p style="margin:0 0 12px;color:#334155;font-size:14px;line-height:1.6;">${escapeHtml(body)}</p>` : ''}
    ${closing ? `<p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">${escapeHtml(closing)}</p>` : ''}
  `;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#1e293b;padding:20px 24px;">
        <span style="color:#ffffff;font-size:15px;font-weight:700;">${escapeHtml(vars.companyName || 'Your Company')}</span>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Preview</p>
        <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">Hi ${escapeHtml(vars.name || 'Candidate')},</p>
        ${content}
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#334155;font-size:14px;font-weight:600;">Best regards,<br/>HR Team</p>
        </div>
      </div>
    </div>
  `;

  return { subject, html };
}

export function renderCareersPreview(
  careers: CareersOverride,
  vars: Record<string, string>
): string {  const c = { ...DEFAULT_CAREERS, ...careers };
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:${c.backgroundColor};border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:${c.headerColor};border-bottom:1px solid #e2e8f0;padding:28px 32px;">
        <div style="display:inline-block;background:${c.primaryColor};color:#ffffff;padding:6px 14px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.08em;margin-bottom:14px;">
          ${escapeHtml(c.brandText || vars.companyName || 'WE MADE CAREERS')}
        </div>
        <h1 style="margin:0 0 10px;color:${c.headerColor === '#ffffff' ? '#0f172a' : c.primaryColor};font-size:32px;font-weight:400;">${escapeHtml(c.heroTitle || 'Join Our Team')}</h1>
        <p style="margin:0;color:${c.textColor};font-size:15px;line-height:1.6;max-width:560px;">${escapeHtml(c.heroSubtitle || '')}</p>
      </div>
      <div style="padding:24px 32px;">
        <h2 style="margin:0 0 4px;color:${c.primaryColor};font-size:18px;font-weight:700;">${escapeHtml(c.openPositionsTitle || 'Open Positions')}</h2>
        <p style="margin:0 0 18px;color:${c.textColor};font-size:13px;">${escapeHtml(c.openPositionsSubtitle || '')}</p>
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;background:#ffffff;margin-bottom:8px;">
          <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">Software Engineer</p>
          <p style="margin:4px 0 0;color:${c.textColor};font-size:12px;">Engineering · Remote · 3+ years · 2 openings</p>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;background:#ffffff;margin-bottom:8px;">
          <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">HR Executive</p>
          <p style="margin:4px 0 0;color:${c.textColor};font-size:12px;">Human Resources · Bengaluru · 1+ year · 1 opening</p>
        </div>
      </div>
      <div style="background:${c.headerColor};border-top:1px solid #e2e8f0;padding:28px 32px;">
        <h2 style="margin:0 0 18px;color:${c.primaryColor};font-size:18px;font-weight:700;text-align:center;">${escapeHtml(c.howToApplyTitle || 'How to Apply')}</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:50%;padding:0 8px 0 0;vertical-align:top;">
              <div style="background:${c.backgroundColor};border-radius:10px;padding:20px;text-align:center;">
                <div style="width:44px;height:44px;border-radius:50%;background:${c.primaryColor};display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;color:#fff;font-size:16px;">✓</div>
                <p style="margin:0 0 6px;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(c.applyOnlineTitle || 'Apply Online')}</p>
                <p style="margin:0;color:${c.textColor};font-size:12px;line-height:1.5;">${escapeHtml(c.applyOnlineDesc || '')}</p>
              </div>
            </td>
            <td style="width:50%;padding:0 0 0 8px;vertical-align:top;">
              <div style="background:${c.backgroundColor};border-radius:10px;padding:20px;text-align:center;">
                <div style="width:44px;height:44px;border-radius:50%;background:${c.primaryColor};display:inline-flex;align-items:center;justify-content:center;margin-bottom:10px;color:#fff;font-size:16px;">✉</div>
                <p style="margin:0 0 6px;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(c.applyEmailTitle || 'Apply via Email')}</p>
                <p style="margin:0;color:${c.textColor};font-size:12px;line-height:1.5;">${escapeHtml(c.applyEmailDesc || '')}</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
      <div style="background:${c.headerColor === '#ffffff' ? c.primaryColor : c.headerColor};color:${c.headerColor === '#ffffff' ? '#ffffff' : c.primaryColor};padding:20px 32px;display:flex;justify-content:space-between;">
        <span style="font-size:13px;font-weight:600;">${escapeHtml(c.footerBrandText || vars.companyName || 'WE MADE CAREERS')}</span>
        <span style="font-size:12px;opacity:0.8;">© ${new Date().getFullYear()} All rights reserved.</span>
      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Sample markup used to visualize where the live job listings / apply form
// will be injected when rendering a custom HTML careers page.
const SAMPLE_JOBS_SLOT = `
  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;background:#fff;margin-bottom:8px;">
    <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">Software Engineer</p>
    <p style="margin:4px 0 0;color:#64748b;font-size:12px;">Engineering · Remote · 3+ years · 2 openings</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;background:#fff;margin-bottom:8px;">
    <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">HR Executive</p>
    <p style="margin:4px 0 0;color:#64748b;font-size:12px;">Human Resources · Bengaluru · 1+ year · 1 opening</p>
  </div>
`;

const SAMPLE_FORM_SLOT = `
  <div style="border:1px solid #e2e8f0;border-radius:12px;padding:24px;background:#fff;">
    <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:700;">Apply for this position</p>
    <p style="margin:0 0 20px;color:#94a3b8;font-size:12px;">The live application form (name, email, phone, experience, resume upload, etc.) renders here.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
      <div style="height:36px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;"></div>
      <div style="height:36px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;"></div>
      <div style="height:36px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;"></div>
      <div style="height:36px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;"></div>
    </div>
    <div style="height:80px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;margin-bottom:16px;"></div>
    <div style="height:40px;width:180px;border-radius:8px;background:#0f172a;"></div>
  </div>
`;

// Build a live-preview of a fully custom HTML careers page. Custom <style> (CSS)
// is inlined in a <style> tag and the {jobListings}/{applyForm} placeholders are
// substituted with sample markup so the admin can see where components land.
export function renderCareersCustomHtmlPreview(
  customHtml: string,
  customCss: string,
  vars: Record<string, string>
): string {
  if (!customHtml || !customHtml.trim()) return '';

  let html = fillTemplateText(customHtml, vars);
  html = html.replace(/\{jobListings\}/g, SAMPLE_JOBS_SLOT);
  html = html.replace(/\{applyForm\}/g, SAMPLE_FORM_SLOT);

  const css = customCss && customCss.trim() ? `<style>${customCss}</style>` : '';
  return `${css}<div style="outline:1px dashed #94a3b8;outline-offset:-1px;">${html}</div>`;
}
