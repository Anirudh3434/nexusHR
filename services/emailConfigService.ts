const API_URL = '/api/email-config';

export interface EmailConfig {
  _id: string;
  companyId: string;
  provider: 'gmail' | 'outlook' | 'other';
  careerEmail: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  lastSyncAt?: string;
  autoReplyEnabled: boolean;
  autoReplyTemplate: string;
  jobKeywords: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailConfigInput {
  companyId: string;
  provider: 'gmail' | 'outlook' | 'other';
  careerEmail: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  autoReplyEnabled?: boolean;
  autoReplyTemplate?: string;
  jobKeywords?: string[];
}

// Get email config
export const getEmailConfig = async (companyId: string): Promise<EmailConfig | null> => {
  const response = await fetch(`${API_URL}?companyId=${companyId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch email config');
  return response.json();
};

// Create or update email config
export const saveEmailConfig = async (data: EmailConfigInput): Promise<EmailConfig> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save email config');
  return response.json();
};

// Update specific fields
export const updateEmailConfig = async (companyId: string, data: Partial<EmailConfig>): Promise<EmailConfig> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, ...data }),
  });
  if (!response.ok) throw new Error('Failed to update email config');
  return response.json();
};

// Delete (deactivate) email config
export const deleteEmailConfig = async (companyId: string): Promise<void> => {
  const response = await fetch(`${API_URL}?companyId=${companyId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete email config');
};

// Gmail OAuth URL
export const getGmailAuthUrl = (companyId: string): string => {
  return `/api/auth/gmail?companyId=${companyId}`;
};

// Outlook OAuth URL
export const getOutlookAuthUrl = (companyId: string): string => {
  return `/api/auth/outlook?companyId=${companyId}`;
};

// Sync emails manually
export const syncEmails = async (companyId: string): Promise<{ synced: number; new: number; message?: string; tokenRefreshed?: boolean }> => {
  const response = await fetch('/api/email-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to sync emails' }));
    throw new Error(error.message || 'Failed to sync emails');
  }
  return response.json();
};
