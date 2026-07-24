const API_URL = '/api/designations';

export interface Designation {
  _id: string;
  name: string;
  department?: string;
  description?: string;
  isActive: boolean;
}

export const getDesignations = async (companyId: string, department?: string): Promise<Designation[]> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('companyId', companyId);
  if (department) url.searchParams.append('department', department);
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Failed to fetch designations');
  return response.json();
};

export const createDesignation = async (data: { name: string; department?: string; description?: string; companyId: string }): Promise<Designation> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create designation');
  return response.json();
};

export const updateDesignation = async (id: string, data: Partial<Designation>): Promise<Designation> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!response.ok) throw new Error('Failed to update designation');
  return response.json();
};

export const deleteDesignation = async (id: string): Promise<void> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('id', id);
  
  const response = await fetch(url.toString(), { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete designation');
};
