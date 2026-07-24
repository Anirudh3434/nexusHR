export type Role = "super_admin" | "admin" | "manager" | "hr" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  status?: string;
  avatar?: string;
  companyId?: string;
  workShiftId?: string;
  salary?: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  status: 'Present' | 'Absent' | 'On Leave' | 'Half Day' | 'Late' | 'On Time' | 'Holiday';
  checkIn?: { 
    time: string; 
    location?: { lat: number; lng: number } 
  };
  checkOut?: { 
    time: string; 
    location?: { lat: number; lng: number } 
  };
  workMode?: 'office' | 'wfh';
  totalHours?: number;
  isLate?: boolean;
}

export interface AuthenticatedResponse {
  message: string;
  user: User;
  token: string;
}
