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

export const bulkImportDesignations = async (
  designations: Array<{ name: string; department?: string; description?: string }>,
  companyId?: string
): Promise<{
  message: string;
  total: number;
  importedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; name: string; reason: string }>;
}> => {
  const response = await fetch(`${API_URL}/bulk-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ designations, companyId }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to bulk import designations');
  }
  return response.json();
};

