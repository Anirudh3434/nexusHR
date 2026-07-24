const API_URL = '/api/leave-entitlements';

export interface LeaveEntitlement {
  _id: string;
  companyId: string;
  leaveTypeId: string | {
    _id: string;
    name: string;
    code: string;
    color: string;
    isPaid: boolean;
  };
  minYears: number;
  maxYears: number | null;
  tierName: string;
  daysPerYear: number;
  accrualType: 'yearly' | 'monthly' | 'quarterly';
  canCarryForward: boolean;
  maxCarryForwardDays: number;
  isActive: boolean;
}

export interface CalculatedLeave {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  daysAllocated: number;
  daysUsed: number;
  daysRemaining: number;
  tierName: string;
  basedOnExperience: number; // years
}

export const getLeaveEntitlements = async (params?: { 
  companyId?: string; 
  leaveTypeId?: string;
  years?: number;
}): Promise<LeaveEntitlement[]> => {
  const url = new URL(API_URL, window.location.origin);
  if (params?.companyId) url.searchParams.append('companyId', params.companyId);
  if (params?.leaveTypeId) url.searchParams.append('leaveTypeId', params.leaveTypeId);
  if (params?.years !== undefined) url.searchParams.append('years', params.years.toString());

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Failed to fetch entitlements');
  return response.json();
};

export const createLeaveEntitlement = async (data: Omit<LeaveEntitlement, '_id' | 'leaveTypeId'> & { 
  leaveTypeId: string;
  companyId: string;
}): Promise<LeaveEntitlement> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create entitlement');
  return response.json();
};

export const updateLeaveEntitlement = async (id: string, data: Partial<LeaveEntitlement>): Promise<LeaveEntitlement> => {
  const response = await fetch(API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!response.ok) throw new Error('Failed to update entitlement');
  return response.json();
};

export const deleteLeaveEntitlement = async (id: string): Promise<void> => {
  const url = new URL(API_URL, window.location.origin);
  url.searchParams.append('id', id);

  const response = await fetch(url.toString(), { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete entitlement');
};

// Calculate years of service from joining date
export const calculateYearsOfService = (joiningDate: string | Date): number => {
  const joinDate = new Date(joiningDate);
  const today = new Date();
  const diffTime = today.getTime() - joinDate.getTime();
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(diffYears);
};

// Calculate prorated leave for new joiners
export const calculateProratedLeave = (
  annualDays: number, 
  joiningDate: string | Date
): number => {
  const joinDate = new Date(joiningDate);
  const today = new Date();
  const endOfYear = new Date(today.getFullYear(), 11, 31); // Dec 31
  
  // Days remaining in year
  const daysRemaining = (endOfYear.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24);
  const totalDaysInYear = 365;
  
  // Prorated days
  return Math.round((annualDays * daysRemaining) / totalDaysInYear);
};

// Calculate leave balances for an employee based on experience
export const calculateEmployeeLeaveBalances = async (
  companyId: string,
  joiningDate: string | Date
): Promise<CalculatedLeave[]> => {
  const yearsOfService = calculateYearsOfService(joiningDate);
  
  // Get all entitlements applicable to this experience level
  const entitlements = await getLeaveEntitlements({ 
    companyId, 
    years: yearsOfService 
  });

  return entitlements.map((ent) => {
    let daysAllocated = ent.daysPerYear;
    
    // If joined this year, prorate the leave
    const joinYear = new Date(joiningDate).getFullYear();
    const currentYear = new Date().getFullYear();
    if (joinYear === currentYear) {
      daysAllocated = calculateProratedLeave(ent.daysPerYear, joiningDate);
    }

    // Handle populated or string leaveTypeId
    const leaveTypeData = typeof ent.leaveTypeId === 'string' 
      ? { _id: ent.leaveTypeId, name: 'Unknown', code: 'UNK' }
      : ent.leaveTypeId;

    return {
      leaveTypeId: leaveTypeData._id,
      leaveTypeName: leaveTypeData.name,
      leaveTypeCode: leaveTypeData.code,
      daysAllocated,
      daysUsed: 0,
      daysRemaining: daysAllocated,
      tierName: ent.tierName,
      basedOnExperience: yearsOfService,
    };
  });
};
