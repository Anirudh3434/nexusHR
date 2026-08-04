import { EmailTemplateKey, EmailTemplateOverride, CareersOverride } from '@/models/CompanyContentConfig';

export interface ContentConfig {
  emailTemplates: Partial<Record<EmailTemplateKey, EmailTemplateOverride>>;
  careers: Partial<CareersOverride>;
}

const API_URL = '/api/content-config';

export const getContentConfig = async (companyId: string): Promise<ContentConfig> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('companyId', companyId);
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch content configuration');
  }
  const data = await response.json();
  return data.config || { emailTemplates: {}, careers: {} };
};

export const saveContentConfig = async (
  companyId: string,
  config: ContentConfig
): Promise<{ message: string; config: ContentConfig }> => {
  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId, ...config }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save content configuration');
  }
  return response.json();
};
