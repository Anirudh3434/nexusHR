const API_URL = '/api/leave-types';

export interface LeaveType {
  _id: string;
  name: string;
  code: string;
  description?: string;
  defaultDays: number;
  isPaid: boolean;
  isActive: boolean;
  color: string;
}

export interface LeaveBalance {
  allocated: number;
  used: number;
  remaining: number;
}

export const getLeaveTypes = async (companyId: string): Promise<LeaveType[]> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('companyId', companyId);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Failed to fetch leave types');
  return response.json();
};

export const createLeaveType = async (data: Omit<LeaveType, '_id'> & { companyId: string }): Promise<LeaveType> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create leave type');
  return response.json();
};

export const updateLeaveType = async (id: string, data: Partial<LeaveType>): Promise<LeaveType> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!response.ok) throw new Error('Failed to update leave type');
  return response.json();
};

export const deleteLeaveType = async (id: string): Promise<void> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('id', id);

  const response = await fetch(url.toString(), { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete leave type');
};
