const API_URL = '/api/notices';

export interface Notice {
  id: string;
  companyId: string;
  title: string;
  content: string;
  category: 'General' | 'Holiday' | 'Policy' | 'Event' | 'Urgent';
  priority: 'Low' | 'Medium' | 'High';
  postedBy: {
    id: string;
    name: string;
    role: string;
  };
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoticeInput {
  companyId: string;
  title: string;
  content: string;
  category?: string;
  priority?: string;
  postedBy: string;
  expiryDate?: string;
}

export const getNotices = async (params?: { companyId?: string; category?: string; limit?: number }): Promise<Notice[]> => {
  const url = new URL(API_URL, window.location.origin);
  if (params?.companyId) url.searchParams.append('companyId', params.companyId);
  if (params?.category) url.searchParams.append('category', params.category);
  if (params?.limit) url.searchParams.append('limit', params.limit.toString());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch notices');
  }
  return response.json();
};

export const createNotice = async (data: CreateNoticeInput): Promise<{ message: string; id: string }> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create notice');
  }
  return response.json();
};

export const deleteNotice = async (id: string): Promise<{ message: string }> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('id', id);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete notice');
  }
  return response.json();
};
