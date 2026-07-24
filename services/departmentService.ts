const API_URL = '/api/departments';

export interface Department {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export const getDepartments = async (companyId: string): Promise<Department[]> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('companyId', companyId);
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Failed to fetch departments');
  return response.json();
};

export const createDepartment = async (data: { name: string; description?: string; companyId: string }): Promise<Department> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create department');
  return response.json();
};

export const updateDepartment = async (id: string, data: Partial<Department>): Promise<Department> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!response.ok) throw new Error('Failed to update department');
  return response.json();
};

export const deleteDepartment = async (id: string): Promise<void> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('id', id);
  
  const response = await fetch(url.toString(), { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete department');
};
