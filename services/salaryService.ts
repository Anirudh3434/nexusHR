const API_URL = '/api/salary';

export interface SalaryComponent {
  name: string;
  type: 'earning' | 'deduction';
  calculationType: 'fixed' | 'percentage' | 'formula';
  value: number;
  percentageOf?: string;
  isTaxable: boolean;
  isActive: boolean;
}

export interface SalaryStructure {
  _id: string;
  companyId: string;
  employeeId: {
    _id: string;
    name: string;
    employeeId: string;
    department: string;
    designation: string;
  };
  effectiveDate: string;
  basicSalary: number;
  components: SalaryComponent[];
  hra: number;
  da: number;
  conveyance: number;
  medical: number;
  specialAllowance: number;
  pf: number;
  esi: number;
  tds: number;
  professionalTax: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  ctc: number;
  isActive: boolean;
  notes: string;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalaryInput {
  companyId: string;
  employeeId: string;
  effectiveDate: string;
  basicSalary: number;
  components?: SalaryComponent[];
  hra?: number;
  da?: number;
  conveyance?: number;
  medical?: number;
  specialAllowance?: number;
  pf?: number;
  esi?: number;
  tds?: number;
  professionalTax?: number;
  notes?: string;
  createdBy: string;
}

export const getSalaries = async (params: { companyId: string; employeeId?: string }): Promise<SalaryStructure[]> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('companyId', params.companyId);
  if (params.employeeId) url.searchParams.append('employeeId', params.employeeId);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Failed to fetch salary structures');
  return response.json();
};

export const createSalary = async (data: CreateSalaryInput): Promise<SalaryStructure> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create salary structure');
  return response.json();
};

export const updateSalary = async (id: string, data: Partial<CreateSalaryInput>): Promise<SalaryStructure> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!response.ok) throw new Error('Failed to update salary structure');
  return response.json();
};

export const deleteSalary = async (id: string): Promise<void> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('id', id);
  
  const response = await fetch(url.toString(), { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete salary structure');
};
