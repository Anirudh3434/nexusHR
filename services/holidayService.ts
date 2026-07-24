const API_URL = '/api/holidays';

export interface Holiday {
  id: string;
  companyId: string;
  name: string;
  date: string;
  type: 'National' | 'Company' | 'Optional' | 'Weekend';
  description?: string;
  isRecurring: boolean;
  createdBy: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
}

export interface CreateHolidayInput {
  companyId: string;
  name: string;
  date: string;
  type?: string;
  description?: string;
  isRecurring?: boolean;
  createdBy: string;
}

export const getHolidays = async (params: { companyId: string; year?: string }): Promise<Holiday[]> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('companyId', params.companyId);
  if (params?.year) url.searchParams.append('year', params.year);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch holidays');
  }
  return response.json();
};

export const createHoliday = async (data: CreateHolidayInput): Promise<{ message: string; id: string }> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create holiday');
  }
  return response.json();
};

export const deleteHoliday = async (id: string): Promise<{ message: string }> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('id', id);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete holiday');
  }
  return response.json();
};
