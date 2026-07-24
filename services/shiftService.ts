const API_URL = '/api/shifts';

export interface WorkShift {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  workingDays: string[];
  lateThreshold: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftInput {
  companyId?: string;
  name: string;
  startTime: string;
  endTime: string;
  workingDays: string[];
  lateThreshold?: number;
}

export const getShifts = async (companyId?: string): Promise<WorkShift[]> => {
  const url = new URL(API_URL, window.location.origin);
  if (companyId) url.searchParams.append('companyId', companyId);
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Failed to fetch shifts');
  return response.json();
};

export const createShift = async (data: CreateShiftInput): Promise<WorkShift> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create shift');
  return response.json();
};

export const updateShift = async (id: string, data: Partial<CreateShiftInput>): Promise<WorkShift> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!response.ok) throw new Error('Failed to update shift');
  return response.json();
};

export const deleteShift = async (id: string): Promise<void> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('id', id);
  
  const response = await fetch(url.toString(), { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete shift');
};
