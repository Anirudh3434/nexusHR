const API_URL = '/api/settings';

export interface Settings {
  id?: string;
  companyId?: string;
  logo?: string | null;
  loginBackground?: string | null;
  loginBackgroundColor?: string;
  primaryColor?: string;
  loginTitle?: string;
  loginSubtitle?: string;
  updatedAt?: string;
}

export const getSettings = async (params?: { companyId?: string; slug?: string }): Promise<Settings> => {
  const url = new URL(API_URL, window.location.origin);
  if (params?.companyId) url.searchParams.append('companyId', params.companyId);
  if (params?.slug) url.searchParams.append('slug', params.slug);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  return response.json();
};

export const updateSettings = async (data: Settings & { updatedBy: string }): Promise<{ message: string; settings: Settings }> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update settings');
  }
  return response.json();
};
