const API_URL = '/api/payroll';

export interface Payroll {
  id: string;
  employeeId: string;
  companyId: string;
  month: number;
  year: number;
  baseSalary: number;
  bonuses: { title: string; amount: number }[];
  deductions: { title: string; amount: number }[];
  netSalary: number;
  status: 'Unpaid' | 'Processing' | 'Paid';
  paymentDate?: string;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Cheque';
  employee?: {
    id: string;
    name: string;
    email: string;
    department?: string;
    designation?: string;
  };
  createdAt: string;
}

export interface CreatePayrollInput {
  employeeId: string;
  companyId: string;
  month: number;
  year: number;
  baseSalary: number;
  bonuses?: { title: string; amount: number }[];
  deductions?: { title: string; amount: number }[];
  netSalary?: number;
  status?: string;
  paymentMethod?: string;
}

export interface UpdatePayrollInput {
  id: string;
  baseSalary?: number;
  bonuses?: { title: string; amount: number }[];
  deductions?: { title: string; amount: number }[];
  netSalary?: number;
  status?: string;
  paymentMethod?: string;
  paymentDate?: string;
}

export const getPayrolls = async (params?: { companyId?: string; employeeId?: string; month?: number; year?: number }): Promise<Payroll[]> => {
  const url = new URL(API_URL, window.location.origin);
  if (params?.companyId) url.searchParams.append('companyId', params.companyId);
  if (params?.employeeId) url.searchParams.append('employeeId', params.employeeId);
  if (params?.month) url.searchParams.append('month', params.month.toString());
  if (params?.year) url.searchParams.append('year', params.year.toString());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch payrolls');
  }
  return response.json();
};

export const createPayroll = async (data: CreatePayrollInput): Promise<{ message: string; id: string }> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create payroll');
  }
  return response.json();
};

export const updatePayroll = async (data: UpdatePayrollInput): Promise<{ message: string }> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update payroll');
  }
  return response.json();
};

export const deletePayroll = async (id: string): Promise<{ message: string }> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('id', id);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete payroll');
  }
  return response.json();
};
