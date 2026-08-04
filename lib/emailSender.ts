import EmailConfig from '../models/EmailConfig';
import CompanyContentConfig, { EmailTemplateOverride, EmailTemplateKey } from '../models/CompanyContentConfig';

export interface EmailOverrides {
  subject?: string;
  intro?: string;
  body?: string;
  closing?: string;
  html?: string;
}

// Wrap a fully-custom HTML template with a generic document shell.
export function applyCustomHtml(customHtml: string | undefined, wrapped: string): string {
  if (!customHtml || !customHtml.trim()) return wrapped;
  return customHtml;
}

export function fillTemplateText(text: string, vars: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (vars[key] !== undefined && vars[key] !== null && vars[key] !== '') return vars[key];
    return match;
  });
}

export async function getEmailTemplateOverrides(
  companyId: string,
  templateKey: EmailTemplateKey
): Promise<EmailTemplateOverride> {
  try {
    const config = await CompanyContentConfig.findOne({ companyId }).lean();
    const t = (config?.emailTemplates as any)?.[templateKey];
    return t || { subject: '', intro: '', body: '', closing: '' };
  } catch {
    return { subject: '', intro: '', body: '', closing: '' };
  }
}

export function emailParts(
  overrides: Partial<EmailOverrides>,
  vars: Record<string, string>,
  defaults: { subject: string; intro: string; body?: string; closing?: string }
): { subject: string; intro: string; body: string; closing: string; html?: string } {
  return {
    subject: overrides.subject ? fillTemplateText(overrides.subject, vars) : fillTemplateText(defaults.subject, vars),
    intro: overrides.intro ? fillTemplateText(overrides.intro, vars) : fillTemplateText(defaults.intro, vars),
    body: overrides.body ? fillTemplateText(overrides.body, vars) : fillTemplateText(defaults.body || '', vars),
    closing: overrides.closing ? fillTemplateText(overrides.closing, vars) : fillTemplateText(defaults.closing || '', vars),
    html: overrides.html ? fillTemplateText(overrides.html, vars) : undefined,
  };
}

interface EmailConfigDoc {
  provider: 'gmail' | 'outlook' | 'other';
  careerEmail: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  companyId: string;
}

export interface SendEmailInput {
  companyId: string;
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  sentAt?: Date;
  error?: string;
  provider?: string;
}

async function getConfig(companyId: string): Promise<EmailConfigDoc | null> {
  return EmailConfig.findOne({ companyId })
    .select('+accessToken +refreshToken +tokenExpiry')
    .lean() as unknown as Promise<EmailConfigDoc | null>;
}

async function refreshToken(config: EmailConfigDoc, provider: 'gmail' | 'outlook'): Promise<string | null> {
  try {
    if (!config.refreshToken) return null;
    const url = provider === 'gmail'
      ? 'https://oauth2.googleapis.com/token'
      : 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const clientId = provider === 'gmail' ? process.env.GMAIL_CLIENT_ID : process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = provider === 'gmail' ? process.env.GMAIL_CLIENT_SECRET : process.env.MICROSOFT_CLIENT_SECRET;
    const tokenResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!tokenResponse.ok) return null;
    const tokenData = await tokenResponse.json();
    const tokenExpiry = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);
    await EmailConfig.findOneAndUpdate(
      { companyId: config.companyId },
      { accessToken: tokenData.access_token, tokenExpiry },
      { new: true }
    );
    return tokenData.access_token;
  } catch {
    return null;
  }
}

function buildRFC822(from: string, fromName: string, to: string, toName: string, subject: string, html: string): string {
  const lines = [
    `From: ${fromName} <${from}>`,
    `To: ${toName ? `${toName} <${to}>` : `<${to}>`}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
  ];
  return lines.join('\r\n');
}

function base64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendViaGmail(config: EmailConfigDoc, input: SendEmailInput, token: string): Promise<boolean> {
  const raw = buildRFC822(
    config.careerEmail,
    'HR Team',
    input.to,
    input.toName || '',
    input.subject,
    input.html
  );
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64Url(raw) }),
  });
  return res.ok;
}

async function sendViaOutlook(config: EmailConfigDoc, input: SendEmailInput, token: string): Promise<boolean> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: { contentType: 'HTML', content: input.html },
        toRecipients: [{ emailAddress: { address: input.to, name: input.toName || '' } }],
      },
      saveToSentItems: true,
    }),
  });
  return res.ok;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = await getConfig(input.companyId);
  if (!config) {
    return { ok: false, error: 'No email configuration found for this company.' };
  }

  if (config.provider === 'other') {
    // SMTP sending requires the nodemailer dependency. Gmail/Outlook OAuth (Mail.Send)
    // is the supported path; fall back to a clear error so the caller can prompt HR.
    return {
      ok: false,
      error: 'Email sending via SMTP is not supported. Connect Gmail or Outlook in Email Settings.',
    };
  }

  const provider = config.provider as 'gmail' | 'outlook';
  let token: string | null | undefined = config.accessToken;
  if (!token) {
    token = await refreshToken(config, provider);
  }
  if (!token) {
    return { ok: false, error: 'Email not connected. Reconnect your email in Email Settings.' };
  }

  let sent = provider === 'gmail'
    ? await sendViaGmail(config, input, token)
    : await sendViaOutlook(config, input, token);

  if (!sent) {
    token = await refreshToken(config, provider);
    if (token) {
      sent = provider === 'gmail'
        ? await sendViaGmail(config, input, token)
        : await sendViaOutlook(config, input, token);
    }
  }

  if (!sent) {
    return { ok: false, error: 'Failed to send email. Check the email connection settings.' };
  }
  return { ok: true, sentAt: new Date(), provider };
}

export function buildPortalAccessEmail(opts: {
  name: string;
  companyName: string;
  position: string;
  loginUrl: string;
  password: string;
}, overrides?: Partial<EmailOverrides>): { subject: string; html: string; text: string } {
  const vars = {
    name: opts.name,
    companyName: opts.companyName,
    position: opts.position,
    loginUrl: opts.loginUrl,
    password: opts.password,
  };
  const parts = emailParts(overrides || {}, vars, {
    subject: `Welcome to ${opts.companyName} — Your candidate portal access`,
    intro: `Congratulations on being selected for the position of <strong>${opts.position}</strong>! Your application has been approved and your onboarding has been initiated.`,
    body: `We have created a temporary account for you on the <strong>Candidate Portal</strong> where you can track your application status, interview rounds, offer letter and complete your onboarding tasks.`,
    closing: `Use your email address and the temporary password above to log in. We recommend changing your password after your first login.`,
  });
  const subject = parts.subject;
  const html = applyCustomHtml(parts.html, `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1e293b;margin-top:0;">Welcome to ${opts.companyName} 🎉</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Dear ${opts.name},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.intro}</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.body}</p>
      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;color:#334155;">
            <strong>Portal Link:</strong><br/><a href="${opts.loginUrl}" style="color:#2563eb;">${opts.loginUrl}</a><br/><br/>
            <strong>Temporary Password:</strong><br/><code style="background:#e2e8f0;padding:4px 8px;border-radius:4px;font-size:15px;">${opts.password}</code>
          </td>
        </tr>
      </table>
      <p style="color:#64748b;font-size:13px;line-height:1.6;">${parts.closing}</p>
      <p style="color:#334155;font-size:15px;">Best regards,<br/>HR Team<br/>${opts.companyName}</p>
    </div>
  `);
  const text = `Welcome to ${opts.companyName}! Congratulations on being selected for ${opts.position}. Log in to the candidate portal (${opts.loginUrl}) with your email and temporary password: ${opts.password}. Change it after first login.`;
  return { subject, html, text };
}

export function buildHiredEmail(opts: {
  name: string;
  companyName: string;
  position: string;
  loginUrl: string;
}, overrides?: Partial<EmailOverrides>): { subject: string; html: string; text: string } {
  const vars = { name: opts.name, companyName: opts.companyName, position: opts.position, loginUrl: opts.loginUrl };
  const parts = emailParts(overrides || {}, vars, {
    subject: `Congratulations — ${opts.position} at ${opts.companyName}!`,
    intro: `Congratulations! We are delighted to confirm that you have been selected for the position of <strong>${opts.position}</strong> at ${opts.companyName}.`,
    body: `Your offer letter and onboarding tasks are now available on the candidate portal. <a href="${opts.loginUrl}" style="color:#2563eb;">Log in here</a> with the same credentials you used to track your application.`,
    closing: '',
  });
  const subject = parts.subject;
  const html = applyCustomHtml(parts.html, `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1e293b;margin-top:0;">You're hired! 🎉</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Dear ${opts.name},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.intro}</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.body}</p>
      <p style="color:#334155;font-size:15px;">Best regards,<br/>HR Team<br/>${opts.companyName}</p>
    </div>
  `);
  const text = `Congratulations! You have been selected for ${opts.position} at ${opts.companyName}. Your offer letter and onboarding tasks are available on the candidate portal: ${opts.loginUrl}`;
  return { subject, html, text };
}

export function buildRoundScheduledEmail(opts: {
  name: string;
  companyName: string;
  position: string;
  roundName: string;
  roundType: string;
  scheduledDate?: string;
  scheduledTime?: string;
  duration?: string;
  interviewer?: string;
  location?: string;
  meetingLink?: string;
  loginUrl: string;
}, overrides?: Partial<EmailOverrides>): { subject: string; html: string; text: string } {
  const vars = {
    name: opts.name,
    companyName: opts.companyName,
    position: opts.position,
    roundName: opts.roundName,
    roundType: opts.roundType,
    scheduledDate: opts.scheduledDate || '',
    scheduledTime: opts.scheduledTime || '',
    loginUrl: opts.loginUrl,
  };
  const parts = emailParts(overrides || {}, vars, {
    subject: `Interview scheduled — ${opts.roundName} for ${opts.position}`,
    intro: `A new interview round has been scheduled for your application to <strong>${opts.position}</strong> at ${opts.companyName}.`,
    body: `Track your application status and round results anytime on the <a href="${opts.loginUrl}" style="color:#2563eb;"> candidate portal</a>.`,
    closing: '',
  });
  const subject = parts.subject;
  const html = applyCustomHtml(parts.html, `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1e293b;margin-top:0;">Interview Round Scheduled</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Dear ${opts.name},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.intro}</p>
      <table style="width:100%;margin:16px 0;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#4b5563;font-size:14px;">Round</td><td style="padding:6px 0;font-weight:600;font-size:14px;">${opts.roundName}${opts.roundType ? ` (${opts.roundType})` : ''}</td></tr>
        ${opts.scheduledDate ? `<tr><td style="padding:6px 0;color:#4b5563;font-size:14px;">Date</td><td style="padding:6px 0;font-weight:600;font-size:14px;">${opts.scheduledDate}</td></tr>` : ''}
        ${opts.scheduledTime ? `<tr><td style="padding:6px 0;color:#4b5563;font-size:14px;">Time</td><td style="padding:6px 0;font-weight:600;font-size:14px;">${opts.scheduledTime}</td></tr>` : ''}
        ${opts.duration ? `<tr><td style="padding:6px 0;color:#4b5563;font-size:14px;">Duration</td><td style="padding:6px 0;font-weight:600;font-size:14px;">${opts.duration}</td></tr>` : ''}
        ${opts.interviewer ? `<tr><td style="padding:6px 0;color:#4b5563;font-size:14px;">Interviewer</td><td style="padding:6px 0;font-weight:600;font-size:14px;">${opts.interviewer}</td></tr>` : ''}
        ${opts.location ? `<tr><td style="padding:6px 0;color:#4b5563;font-size:14px;">Location / Mode</td><td style="padding:6px 0;font-weight:600;font-size:14px;">${opts.location}</td></tr>` : ''}
        ${opts.meetingLink ? `<tr><td style="padding:6px 0;color:#4b5563;font-size:14px;">Meeting Link</td><td style="padding:6px 0;font-weight:600;font-size:14px;"><a href="${opts.meetingLink}" style="color:#2563eb;">${opts.meetingLink}</a></td></tr>` : ''}
      </table>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.body}</p>
      <p style="color:#334155;font-size:15px;">Best regards,<br/>HR Team<br/>${opts.companyName}</p>
    </div>
  `);
  const text = `A new interview round (${opts.roundName}) has been scheduled for your ${opts.position} application.${opts.scheduledDate ? ` Date: ${opts.scheduledDate}` : ''}${opts.scheduledTime ? `, Time: ${opts.scheduledTime}` : ''}. Track your status on the candidate portal: ${opts.loginUrl}`;
  return { subject, html, text };
}

export function buildRoundResultEmail(opts: {
  name: string;
  companyName: string;
  position: string;
  roundName: string;
  result: 'cleared' | 'failed';
  loginUrl: string;
}, overrides?: Partial<EmailOverrides>): { subject: string; html: string; text: string } {
  const cleared = opts.result === 'cleared';
  const vars = {
    name: opts.name,
    companyName: opts.companyName,
    position: opts.position,
    roundName: opts.roundName,
    loginUrl: opts.loginUrl,
  };
  const parts = emailParts(overrides || {}, vars, {
    subject: cleared
      ? `Great news — you cleared ${opts.roundName}!`
      : `Update on your ${opts.roundName} result`,
    intro: cleared
      ? `Congratulations! You have cleared the <strong>${opts.roundName}</strong> round for the <strong>${opts.position}</strong> position at ${opts.companyName}.`
      : `Thank you for participating in the <strong>${opts.roundName}</strong> round for the <strong>${opts.position}</strong> position at ${opts.companyName}. Unfortunately, you have not been selected to move forward at this stage.`,
    body: `${cleared ? 'We will be in touch shortly with the next steps. You can also ' : 'You can '}<a href="${opts.loginUrl}" style="color:#2563eb;">track your application status</a> on the candidate portal.`,
    closing: '',
  });
  const subject = parts.subject;
  const html = applyCustomHtml(parts.html, `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1e293b;margin-top:0;">${cleared ? 'Round Cleared! 🎉' : 'Round Result Update'}</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Dear ${opts.name},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.intro}</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.body}</p>
      <p style="color:#334155;font-size:15px;">Best regards,<br/>HR Team<br/>${opts.companyName}</p>
    </div>
  `);
  const text = cleared
    ? `Congratulations! You cleared the ${opts.roundName} round for ${opts.position} at ${opts.companyName}. Track your status: ${opts.loginUrl}`
    : `Update on your ${opts.roundName} result for ${opts.position} at ${opts.companyName}. Track your status: ${opts.loginUrl}`;
  return { subject, html, text };
}

export function buildOfferEmail(opts: {
  name: string;
  companyName: string;
  position: string;
  offerHtml: string;
}, overrides?: Partial<EmailOverrides>): { subject: string; html: string; text: string } {
  const vars = { name: opts.name, companyName: opts.companyName, position: opts.position };
  const parts = emailParts(overrides || {}, vars, {
    subject: `Offer Letter — ${opts.position} at ${opts.companyName}`,
    intro: `We are pleased to share your offer letter for the position of <strong>${opts.position}</strong> at ${opts.companyName}. Please review the details below and accept or decline the offer through the candidate portal.`,
    body: '',
    closing: '',
  });
  const subject = parts.subject;
  const html = applyCustomHtml(parts.html, `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:700px;margin:auto;">
      <p style="color:#334155;font-size:15px;line-height:1.6;">Dear ${opts.name},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.intro}</p>
      ${parts.body ? `<p style="color:#334155;font-size:15px;line-height:1.6;">${parts.body}</p>` : ''}
      <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;">
        ${opts.offerHtml}
      </div>
      ${parts.closing ? `<p style="color:#334155;font-size:15px;line-height:1.6;">${parts.closing}</p>` : ''}
      <p style="color:#334155;font-size:15px;line-height:1.6;">Best regards,<br/>HR Team<br/>${opts.companyName}</p>
    </div>
  `);
  const text = `Dear ${opts.name}, please review your offer letter for the position of ${opts.position} at ${opts.companyName}. Accept or decline it through the candidate portal.`;
  return { subject, html, text };
}

export function buildOfferResponseNotification(opts: {
  candidateName: string;
  companyName: string;
  position: string;
  accepted: boolean;
  responseNotes?: string;
  loginUrl: string;
}, overrides?: Partial<EmailOverrides>): { subject: string; html: string; text: string } {
  const accepted = opts.accepted;
  const vars = {
    candidateName: opts.candidateName,
    companyName: opts.companyName,
    position: opts.position,
    loginUrl: opts.loginUrl,
  };
  const parts = emailParts(overrides || {}, vars, {
    subject: opts.accepted
      ? `${opts.candidateName} accepted the offer for ${opts.position}`
      : `${opts.candidateName} declined the offer for ${opts.position}`,
    intro: `<strong>${opts.candidateName}</strong> has ${opts.accepted ? 'accepted' : 'declined'} the offer for the position of <strong>${opts.position}</strong> at ${opts.companyName}.`,
    body: opts.responseNotes ? `<em>"${opts.responseNotes}"</em>` : '',
    closing: `View the onboarding record here: <a href="${opts.loginUrl}" style="color:#2563eb;">${opts.loginUrl}</a>`,
  });
  const subject = parts.subject;
  const html = applyCustomHtml(parts.html, `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1e293b;margin-top:0;">Offer ${opts.accepted ? 'Accepted' : 'Declined'} ${opts.accepted ? '🎉' : ''}</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.intro}</p>
      ${parts.body ? `<p style="color:#334155;font-size:15px;line-height:1.6;">${parts.body}</p>` : ''}
      <p style="color:#64748b;font-size:13px;line-height:1.6;">${parts.closing}</p>
      <p style="color:#334155;font-size:15px;">Best regards,<br/>NexusHR</p>
    </div>
  `);
  const text = `${opts.candidateName} has ${opts.accepted ? 'accepted' : 'declined'} the offer for ${opts.position} at ${opts.companyName}.`;
  return { subject, html, text };
}

export function buildRejectionEmail(opts: {
  name: string;
  companyName: string;
  position: string;
  reason?: string;
  loginUrl: string;
}, overrides?: Partial<EmailOverrides>): { subject: string; html: string; text: string } {
  const vars = {
    name: opts.name,
    companyName: opts.companyName,
    position: opts.position,
    loginUrl: opts.loginUrl,
  };
  const parts = emailParts(overrides || {}, vars, {
    subject: `Update on your application — ${opts.position} at ${opts.companyName}`,
    intro: `Thank you for applying for the <strong>${opts.position}</strong> position at ${opts.companyName}. After careful review, we have decided not to move forward with your application at this time.`,
    body: `We appreciate the time and effort you invested and encourage you to apply for future opportunities.`,
    closing: '',
  });
  const subject = parts.subject;
  const html = applyCustomHtml(parts.html, `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1e293b;margin-top:0;">Application Update</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Dear ${opts.name},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.intro}</p>
      ${opts.reason ? `<p style="color:#334155;font-size:15px;line-height:1.6;"><strong>Reason:</strong> ${opts.reason}</p>` : ''}
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.body}</p>
      <p style="color:#334155;font-size:15px;">Best regards,<br/>HR Team<br/>${opts.companyName}</p>
    </div>
  `);
  const text = `Dear ${opts.name}, thank you for applying for ${opts.position} at ${opts.companyName}. After careful review, we have decided not to move forward with your application at this time.${opts.reason ? ` Reason: ${opts.reason}` : ''}`;
  return { subject, html, text };
}

export function buildPasswordResetEmail(opts: {
  name: string;
  companyName: string;
  loginUrl: string;
  password: string;
}, overrides?: Partial<EmailOverrides>): { subject: string; html: string; text: string } {
  const vars = {
    name: opts.name,
    companyName: opts.companyName,
    loginUrl: opts.loginUrl,
    password: opts.password,
  };
  const parts = emailParts(overrides || {}, vars, {
    subject: `Your ${opts.companyName} portal password has been reset`,
    intro: `Your temporary password has been reset. Use the new password below to log in to the candidate portal.`,
    body: '',
    closing: '',
  });
  const subject = parts.subject;
  const html = applyCustomHtml(parts.html, `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1e293b;margin-top:0;">Password reset</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Dear ${opts.name},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">${parts.intro}</p>
      ${parts.body ? `<p style="color:#334155;font-size:15px;line-height:1.6;">${parts.body}</p>` : ''}
      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr>
          <td style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;color:#334155;">
            <strong>Portal Link:</strong><br/><a href="${opts.loginUrl}" style="color:#2563eb;">${opts.loginUrl}</a><br/><br/>
            <strong>New Temporary Password:</strong><br/><code style="background:#e2e8f0;padding:4px 8px;border-radius:4px;font-size:15px;">${opts.password}</code>
          </td>
        </tr>
      </table>
      ${parts.closing ? `<p style="color:#334155;font-size:15px;line-height:1.6;">${parts.closing}</p>` : ''}
      <p style="color:#334155;font-size:15px;">Best regards,<br/>HR Team<br/>${opts.companyName}</p>
    </div>
  `);
  const text = `Your temporary password has been reset. Log in to ${opts.loginUrl} with your email and new password: ${opts.password}.`;
  return { subject, html, text };
}
