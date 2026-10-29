/**
 * Robust CSV utilities for NexusHR:
 * - RFC 4180 compliant CSV parser (handles quoted commas, double quotes, newlines inside cells)
 * - Template download generators
 * - Parsers & row validators for Departments, Designations, and Employees
 */

export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  // Normalize line endings
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  while (i < cleanText.length) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote: ""
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
      i++;
      continue;
    }

    if (char === '\n' && !inQuotes) {
      row.push(current.trim());
      // Only push non-empty rows
      if (row.some(cell => cell.length > 0)) {
        result.push(row);
      }
      row = [];
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Final cell
  row.push(current.trim());
  if (row.some(cell => cell.length > 0)) {
    result.push(row);
  }

  return result;
}

export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ----------------------
// TEMPLATES
// ----------------------

export const DEPARTMENT_CSV_TEMPLATE = `Department Name,Description
Engineering,"Software engineering, product development, and systems infrastructure"
Human Resources,"Talent acquisition, employee welfare, and company policies"
Product Management,"Product strategy, roadmaps, and feature specifications"
Marketing,"Brand growth, digital marketing, and content strategy"
Finance & Accounts,"Budgeting, payroll accounting, and financial reporting"
Sales & Business Development,"Client relationships, enterprise partnerships, and revenue"`;

export const DESIGNATION_CSV_TEMPLATE = `Designation Name,Department,Description
Senior Software Engineer,Engineering,"Full-stack web application development"
Frontend Developer,Engineering,"Next.js, React, and UI/UX design systems"
QA Automation Engineer,Engineering,"Automated testing and release validation"
HR Operations Manager,Human Resources,"Recruitment, onboarding, and employee relations"
Product Manager,Product Management,"Roadmap execution and sprint planning"
Senior Account Executive,Sales & Business Development,"Enterprise B2B client acquisition"`;

export const EMPLOYEE_CSV_TEMPLATE = `Employee ID,Full Name,Email,Role,Department,Designation,Phone,Salary,Joining Date,Password
EMP001,Aarav Sharma,aarav.sharma@example.com,employee,Engineering,Senior Software Engineer,+91 9876543210,95000,2025-01-15,Welcome@123
EMP002,Priya Patel,priya.patel@example.com,manager,Human Resources,HR Operations Manager,+91 9876543211,85000,2024-11-01,Welcome@123
EMP003,Rohan Verma,rohan.verma@example.com,employee,Product Management,Product Manager,+91 9876543212,110000,2025-02-01,Welcome@123
EMP004,Neha Gupta,neha.gupta@example.com,employee,Sales & Business Development,Senior Account Executive,+91 9876543213,65000,2025-03-10,Welcome@123`;

// ----------------------
// ROW PARSERS & VALIDATORS
// ----------------------

export interface ParsedDepartmentRow {
  rowNumber: number;
  name: string;
  description: string;
  isValid: boolean;
  error?: string;
}

export function parseDepartmentCSV(rows: string[][]): ParsedDepartmentRow[] {
  if (rows.length === 0) return [];

  // Determine if first row is header
  const firstRow = rows[0].map(c => c.toLowerCase());
  const hasHeader = firstRow.some(c => c.includes('dept') || c.includes('name') || c.includes('title'));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((row, idx) => {
    const rowNumber = hasHeader ? idx + 2 : idx + 1;
    const name = (row[0] || '').trim();
    const description = (row[1] || '').trim();

    if (!name) {
      return {
        rowNumber,
        name: '',
        description,
        isValid: false,
        error: 'Department name is required',
      };
    }

    return {
      rowNumber,
      name,
      description,
      isValid: true,
    };
  });
}

export interface ParsedDesignationRow {
  rowNumber: number;
  name: string;
  department: string;
  description: string;
  isValid: boolean;
  error?: string;
}

export function parseDesignationCSV(rows: string[][]): ParsedDesignationRow[] {
  if (rows.length === 0) return [];

  const firstRow = rows[0].map(c => c.toLowerCase());
  const hasHeader = firstRow.some(c => c.includes('desig') || c.includes('title') || c.includes('name'));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((row, idx) => {
    const rowNumber = hasHeader ? idx + 2 : idx + 1;
    const name = (row[0] || '').trim();
    const department = (row[1] || '').trim();
    const description = (row[2] || '').trim();

    if (!name) {
      return {
        rowNumber,
        name: '',
        department,
        description,
        isValid: false,
        error: 'Designation name is required',
      };
    }

    return {
      rowNumber,
      name,
      department,
      description,
      isValid: true,
    };
  });
}

export interface ParsedEmployeeRow {
  rowNumber: number;
  employeeId?: string;
  name: string;
  email: string;
  role: 'admin' | 'hr' | 'manager' | 'employee';
  department: string;
  designation: string;
  phone: string;
  salary?: number;
  joiningDate?: string;
  password?: string;
  isValid: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ['admin', 'hr', 'manager', 'employee'];

export function parseEmployeeCSV(rows: string[][]): ParsedEmployeeRow[] {
  if (rows.length === 0) return [];

  const header = rows[0].map(c => c.toLowerCase().trim().replace(/[\s_-]+/g, ''));
  const hasHeader = header.some(h => h.includes('email') || h.includes('name') || h.includes('id'));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  // Map header indexes if header exists
  let idIdx = 0;
  let nameIdx = 1;
  let emailIdx = 2;
  let roleIdx = 3;
  let deptIdx = 4;
  let desigIdx = 5;
  let phoneIdx = 6;
  let salaryIdx = 7;
  let dateIdx = 8;
  let pwdIdx = 9;

  if (hasHeader) {
    idIdx = header.findIndex(h => h.includes('id') && !h.includes('email'));
    nameIdx = header.findIndex(h => h.includes('name'));
    emailIdx = header.findIndex(h => h.includes('email'));
    roleIdx = header.findIndex(h => h.includes('role'));
    deptIdx = header.findIndex(h => h.includes('dept') || h.includes('department'));
    desigIdx = header.findIndex(h => h.includes('desig') || h.includes('title') || h.includes('position'));
    phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
    salaryIdx = header.findIndex(h => h.includes('salary') || h.includes('comp') || h.includes('pay'));
    dateIdx = header.findIndex(h => h.includes('date') || h.includes('join') || h.includes('hire'));
    pwdIdx = header.findIndex(h => h.includes('pass') || h.includes('pwd'));

    // Fallbacks if not recognized
    if (nameIdx === -1) nameIdx = 0;
    if (emailIdx === -1) emailIdx = 1;
  }

  const seenEmails = new Set<string>();

  return dataRows.map((row, idx) => {
    const rowNumber = hasHeader ? idx + 2 : idx + 1;
    const employeeId = idIdx >= 0 && row[idIdx] ? row[idIdx].trim() : undefined;
    const name = nameIdx >= 0 && row[nameIdx] ? row[nameIdx].trim() : '';
    const email = emailIdx >= 0 && row[emailIdx] ? row[emailIdx].trim().toLowerCase() : '';
    const rawRole = roleIdx >= 0 && row[roleIdx] ? row[roleIdx].trim().toLowerCase() : 'employee';
    const department = deptIdx >= 0 && row[deptIdx] ? row[deptIdx].trim() : '';
    const designation = desigIdx >= 0 && row[desigIdx] ? row[desigIdx].trim() : '';
    const phone = phoneIdx >= 0 && row[phoneIdx] ? row[phoneIdx].trim() : '';
    const rawSalary = salaryIdx >= 0 && row[salaryIdx] ? row[salaryIdx].trim().replace(/[^0-9.]/g, '') : '';
    const salary = rawSalary ? Number(rawSalary) : undefined;
    const joiningDate = dateIdx >= 0 && row[dateIdx] ? row[dateIdx].trim() : undefined;
    const password = pwdIdx >= 0 && row[pwdIdx] ? row[pwdIdx].trim() : undefined;

    const role = (ALLOWED_ROLES.includes(rawRole) ? rawRole : 'employee') as 'admin' | 'hr' | 'manager' | 'employee';

    if (!name) {
      return {
        rowNumber,
        employeeId,
        name: '',
        email,
        role,
        department,
        designation,
        phone,
        salary,
        joiningDate,
        password,
        isValid: false,
        error: 'Employee name is required',
      };
    }

    if (!email) {
      return {
        rowNumber,
        employeeId,
        name,
        email: '',
        role,
        department,
        designation,
        phone,
        salary,
        joiningDate,
        password,
        isValid: false,
        error: 'Email address is required',
      };
    }

    if (!EMAIL_REGEX.test(email)) {
      return {
        rowNumber,
        employeeId,
        name,
        email,
        role,
        department,
        designation,
        phone,
        salary,
        joiningDate,
        password,
        isValid: false,
        error: `Invalid email format: "${email}"`,
      };
    }

    if (seenEmails.has(email)) {
      return {
        rowNumber,
        employeeId,
        name,
        email,
        role,
        department,
        designation,
        phone,
        salary,
        joiningDate,
        password,
        isValid: false,
        error: `Duplicate email within CSV: "${email}"`,
      };
    }
    seenEmails.add(email);

    return {
      rowNumber,
      employeeId,
      name,
      email,
      role,
      department,
      designation,
      phone,
      salary,
      joiningDate,
      password,
      isValid: true,
    };
  });
}
