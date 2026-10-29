const API_URL = '/api/employees';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  designation?: string;
  phone?: string;
  avatar?: string;
  status?: string;
  hireDate?: string;
  isActive?: boolean;
  salary?: number;
  workShiftId?: string;
  isGeoFencingExempt?: boolean;
  geoFencingExemptUntil?: string | Date;
  overtimePreference?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  password: string;
  role?: string;
  department?: string;
}

export const getEmployees = async (companyId?: string): Promise<Employee[]> => {
  const url = new URL(API_URL, window.location.origin);
  if (companyId) url.searchParams.append('companyId', companyId);
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch employees');
  }
  return response.json();
};

export const createEmployee = async (data: CreateEmployeeInput): Promise<{ message: string; id: string }> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create employee');
  }
  return response.json();
};

export const bulkImportEmployees = async (
  employees: Array<{
    employeeId?: string;
    name: string;
    email: string;
    role?: string;
    department?: string;
    designation?: string;
    phone?: string;
    salary?: number;
    joiningDate?: string;
    password?: string;
  }>,
  companyId?: string
): Promise<{
  message: string;
  total: number;
  importedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; email?: string; name?: string; reason: string }>;
}> => {
  const response = await fetch(`${API_URL}/bulk-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employees, companyId }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to bulk import employees');
  }
  return response.json();
};

