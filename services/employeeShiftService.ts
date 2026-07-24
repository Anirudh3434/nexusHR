const API_URL = '/api/employees/shift';

export interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  designation: string;
  salary?: number;
  workShiftId?: {
    _id: string;
    name: string;
    startTime: string;
    endTime: string;
  } | null;
  status: string;
}

export const getEmployeesByShift = async (params: { companyId: string; shiftId?: string }): Promise<Employee[]> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('companyId', params.companyId);
  if (params.shiftId) url.searchParams.append('shiftId', params.shiftId);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Failed to fetch employees');
  return response.json();
};

export const updateEmployeeShift = async (employeeId: string, workShiftId: string | null): Promise<Employee> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, workShiftId }),
  });
  if (!response.ok) throw new Error('Failed to update shift assignment');
  return response.json();
};
