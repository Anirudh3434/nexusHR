import nodemailer, { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface SmtpOptions {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Resolves SMTP configuration combining custom overrides and environment variables.
 */
export function getSmtpConfig(custom?: SmtpOptions) {
  const host = custom?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = custom?.port ? Number(custom.port) : (Number(process.env.SMTP_PORT) || 465);
  const secure = custom?.secure !== undefined ? Boolean(custom.secure) : (port === 465);
  const user = custom?.user || process.env.SMTP_USER || process.env.GMAIL_USER || 'nexushr36@gmail.com';
  const pass = (custom?.pass || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  return { host, port, secure, user, pass };
}

let cachedDefaultTransporter: Transporter<any> | null = null;

/**
 * Creates or retrieves a nodemailer transporter.
 */
export function createTransporter(custom?: SmtpOptions): Transporter<any> {
  const config = getSmtpConfig(custom);

  // If using default settings, reuse singleton instance with connection pool
  if (!custom && cachedDefaultTransporter) {
    return cachedDefaultTransporter;
  }

  const isGmail = config.host.includes('gmail.com');

  const transportOptions = isGmail
    ? {
        service: 'gmail',
        auth: {
          user: config.user,
          pass: config.pass,
        },
      }
    : {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      };

  const transporter = nodemailer.createTransport(transportOptions as any);

  if (!custom) {
    cachedDefaultTransporter = transporter;
  }

  return transporter;
}

/**
 * Verifies SMTP connection to ensure credentials and host are valid.
 */
export async function verifySmtpConnection(custom?: SmtpOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter(custom);
    await transporter.verify();
    return { success: true };
  } catch (err: any) {
    console.error('[Nodemailer] SMTP verification failed:', err.message);
    return { success: false, error: err.message || 'SMTP verification failed' };
  }
}

/**
 * Sends an email using Nodemailer.
 */
export async function sendMail(
  options: SendMailOptions,
  customConfig?: SmtpOptions
): Promise<SendMailResult> {
  try {
    const config = getSmtpConfig(customConfig);

    if (!config.user || !config.pass) {
      return {
        success: false,
        error: 'Missing SMTP credentials. Please configure GMAIL_USER and GMAIL_APP_PASSWORD or SMTP settings.',
      };
    }

    const transporter = createTransporter(customConfig);

    const fromAddress = options.from || process.env.SMTP_FROM_EMAIL || config.user;
    const fromDisplayName = options.fromName || process.env.SMTP_FROM_NAME || 'NexusHR';
    const formattedFrom = `"${fromDisplayName}" <${fromAddress}>`;

    const toAddresses = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    const info = await transporter.sendMail({
      from: formattedFrom,
      to: toAddresses,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo || fromAddress,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[Nodemailer] sendMail error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email via SMTP',
    };
  }
}

export default {
  createTransporter,
  verifySmtpConnection,
  sendMail,
  getSmtpConfig,
};
