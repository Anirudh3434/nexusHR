const API_URL = '/api/leaves';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  department?: string;
  companyId: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays?: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approvedBy?: string;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLeaveInput {
  employeeId: string;
  companyId: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays?: number;
  reason?: string;
}

export interface UpdateLeaveInput {
  id: string;
  status: 'Approved' | 'Rejected' | 'Cancelled';
  approvedBy?: string;
  comment?: string;
}

export const getLeaves = async (params?: { status?: string; employeeId?: string }): Promise<LeaveRequest[]> => {
  const url = new URL(API_URL, window.location.origin);
  if (params?.status) url.searchParams.append('status', params.status);
  if (params?.employeeId) url.searchParams.append('employeeId', params.employeeId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch leaves');
  }
  return response.json();
};

export const createLeave = async (data: CreateLeaveInput): Promise<{ message: string; id: string }> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create leave request');
  }
  return response.json();
};

export const updateLeaveStatus = async (data: UpdateLeaveInput): Promise<{ message: string; leave: LeaveRequest }> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update leave status');
  }
  return response.json();
};
