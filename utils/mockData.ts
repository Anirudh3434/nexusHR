export type Role = 'admin' | 'hr' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  department?: string;
}

export const DUMMY_USERS: User[] = [
  { id: '1', name: 'Alice Admin', email: 'admin@hrm.com', role: 'admin', avatar: 'https://ui-avatars.com/api/?name=Alice+Admin&background=random' },
  { id: '2', name: 'Hank HR', email: 'hr@hrm.com', role: 'hr', avatar: 'https://ui-avatars.com/api/?name=Hank+HR&background=random' },
  { id: '3', name: 'Emma Employee', email: 'employee@hrm.com', role: 'employee', department: 'Engineering', avatar: 'https://ui-avatars.com/api/?name=Emma+Employee&background=random' },
];

export const MOCK_EMPLOYEES = [
  { ...DUMMY_USERS[0], id: '1', status: 'Active', hireDate: '2023-01-15' },
  { ...DUMMY_USERS[1], id: '2', status: 'Active', hireDate: '2023-03-10' },
  { ...DUMMY_USERS[2], id: '3', status: 'Active', hireDate: '2024-05-22' },
  { id: '4', name: 'John Doe', email: 'john.doe@hrm.com', role: 'employee', department: 'Marketing', status: 'On Leave', hireDate: '2022-11-05' },
  { id: '5', name: 'Jane Smith', email: 'jane.smith@hrm.com', role: 'employee', department: 'Sales', status: 'Active', hireDate: '2024-01-20' },
];

export const MOCK_ATTENDANCE = [
  { id: 'a1', employeeId: '3', employeeName: 'Emma Employee', date: '2024-10-24', status: 'Present', checkIn: '08:55 AM', checkOut: '05:05 PM' },
  { id: 'a2', employeeId: '4', employeeName: 'John Doe', date: '2024-10-24', status: 'On Leave', checkIn: '-', checkOut: '-' },
  { id: 'a3', employeeId: '5', employeeName: 'Jane Smith', date: '2024-10-24', status: 'Present', checkIn: '09:02 AM', checkOut: '05:15 PM' },
  { id: 'a4', employeeId: '3', employeeName: 'Emma Employee', date: '2024-10-23', status: 'Present', checkIn: '08:50 AM', checkOut: '05:00 PM' },
];
