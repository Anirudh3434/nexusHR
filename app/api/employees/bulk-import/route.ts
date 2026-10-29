import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Department from '@/models/Department';
import Designation from '@/models/Designation';
import bcrypt from 'bcryptjs';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { DEFAULT_PROBATION_MONTHS, buildProbationWindow } from '@/lib/probation';

const WRITE_ROLES = ['super_admin', 'admin', 'hr'];
const ALLOWED_ROLES = ['admin', 'hr', 'manager', 'employee'];
const DEFAULT_PASSWORD = 'Welcome@123';

export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const isSuperAdmin = auth.role === 'super_admin';
    const companyId = isSuperAdmin ? (body.companyId || auth.companyId) : auth.companyId;

    if (!companyId) {
      return NextResponse.json({ message: 'Company scope required' }, { status: 400 });
    }

    const { employees } = body;
    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json({ message: 'No employees provided' }, { status: 400 });
    }

    // Collect all emails and employeeIds for batch duplicate checking
    const incomingEmails = employees
      .map(e => (e.email || '').trim().toLowerCase())
      .filter(Boolean);

    const incomingEmpIds = employees
      .map(e => (e.employeeId || '').trim())
      .filter(Boolean);

    // Find existing users by email
    const existingEmailUsers = await User.find({ email: { $in: incomingEmails } }).select('email');
    const existingEmailSet = new Set(existingEmailUsers.map((u: any) => u.email.toLowerCase()));

    // Find existing users by employeeId
    let existingEmpIdSet = new Set<string>();
    if (incomingEmpIds.length > 0) {
      const existingIdUsers = await User.find({ employeeId: { $in: incomingEmpIds } }).select('employeeId');
      existingEmpIdSet = new Set(existingIdUsers.map((u: any) => u.employeeId));
    }

    const errors: Array<{ row: number; email?: string; name?: string; reason: string }> = [];
    const validRecords: any[] = [];
    let skippedCount = 0;

    const seenInBatchEmails = new Set<string>();
    const seenInBatchIds = new Set<string>();

    for (let index = 0; index < employees.length; index++) {
      const emp = employees[index];
      const rowNum = index + 1;
      const name = (emp.name || '').trim();
      const email = (emp.email || '').trim().toLowerCase();
      const employeeId = (emp.employeeId || '').trim() || undefined;
      const rawRole = (emp.role || '').trim().toLowerCase();
      const role = ALLOWED_ROLES.includes(rawRole) ? rawRole : 'employee';
      const department = (emp.department || '').trim();
      const designation = (emp.designation || '').trim();
      const phone = (emp.phone || '').trim();
      const rawSalary = emp.salary !== undefined && emp.salary !== null && emp.salary !== '' ? Number(emp.salary) : undefined;
      const salary = rawSalary && !isNaN(rawSalary) ? rawSalary : undefined;
      const password = (emp.password || '').trim() || DEFAULT_PASSWORD;

      let joiningDate: Date | undefined;
      if (emp.joiningDate) {
        const parsedDate = new Date(emp.joiningDate);
        if (!isNaN(parsedDate.getTime())) {
          joiningDate = parsedDate;
        }
      }

      if (!name) {
        errors.push({ row: rowNum, email, name, reason: 'Employee name is required' });
        continue;
      }

      if (!email) {
        errors.push({ row: rowNum, email, name, reason: 'Email address is required' });
        continue;
      }

      if (existingEmailSet.has(email)) {
        skippedCount++;
        errors.push({ row: rowNum, email, name, reason: `Email "${email}" is already registered` });
        continue;
      }

      if (seenInBatchEmails.has(email)) {
        skippedCount++;
        errors.push({ row: rowNum, email, name, reason: `Duplicate email "${email}" within CSV file` });
        continue;
      }
      seenInBatchEmails.add(email);

      if (employeeId) {
        if (existingEmpIdSet.has(employeeId)) {
          skippedCount++;
          errors.push({ row: rowNum, email, name, reason: `Employee ID "${employeeId}" already exists` });
          continue;
        }
        if (seenInBatchIds.has(employeeId)) {
          skippedCount++;
          errors.push({ row: rowNum, email, name, reason: `Duplicate Employee ID "${employeeId}" in CSV` });
          continue;
        }
        seenInBatchIds.add(employeeId);
      }

      validRecords.push({
        rowNum,
        name,
        email,
        employeeId,
        password,
        role,
        department,
        designation,
        phone,
        salary,
        joiningDate: joiningDate || new Date(),
      });
    }

    // Hash passwords and prepare documents
    const createdUsers: any[] = [];
    const deptsToEnsure = new Set<string>();
    const desigsToEnsure = new Map<string, string>(); // designation -> department

    for (const record of validRecords) {
      try {
        const hashedPassword = await bcrypt.hash(record.password, 10);
        const userData: any = {
          name: record.name,
          email: record.email,
          password: hashedPassword,
          role: record.role,
          companyId,
          isActive: true,
          status: 'Active',
          mustChangePassword: record.password === DEFAULT_PASSWORD, // force change if default
          joiningDate: record.joiningDate,
        };

        // Bulk imports default to a standard probation window from the joining date.
        const probation = buildProbationWindow(record.joiningDate, DEFAULT_PROBATION_MONTHS);
        if (probation) {
          userData.probationStatus = 'on_probation';
          userData.probationMonths = probation.months;
          userData.probationStartDate = probation.startDate;
          userData.probationEndDate = probation.endDate;
        }

        if (record.employeeId) userData.employeeId = record.employeeId;
        if (record.department) {
          userData.department = record.department;
          deptsToEnsure.add(record.department);
        }
        if (record.designation) {
          userData.designation = record.designation;
          desigsToEnsure.set(record.designation, record.department || '');
        }
        if (record.phone) userData.phone = record.phone;
        if (record.salary) userData.salary = record.salary;

        const newUser = await User.create(userData);
        createdUsers.push({
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department,
          designation: newUser.designation,
          employeeId: newUser.employeeId,
        });
      } catch (err: any) {
        console.error('Failed to create single user during bulk import:', err);
        errors.push({
          row: record.rowNum,
          email: record.email,
          name: record.name,
          reason: err.message || 'Database creation error',
        });
      }
    }

    // Auto-seed missing departments and designations asynchronously in background if provided
    (async () => {
      try {
        for (const deptName of Array.from(deptsToEnsure)) {
          await Department.updateOne(
            { companyId, name: { $regex: new RegExp(`^${deptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            { $setOnInsert: { companyId, name: deptName, description: 'Auto-created from employee import', isActive: true } },
            { upsert: true }
          );
        }
        for (const [desigName, deptName] of Array.from(desigsToEnsure.entries())) {
          await Designation.updateOne(
            {
              companyId,
              name: { $regex: new RegExp(`^${desigName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            },
            {
              $setOnInsert: {
                companyId,
                name: desigName,
                department: deptName || undefined,
                description: 'Auto-created from employee import',
                isActive: true,
              },
            },
            { upsert: true }
          );
        }
      } catch (e) {
        console.warn('Non-fatal: could not auto-sync departments/designations:', e);
      }
    })();

    return NextResponse.json({
      message: `Imported ${createdUsers.length} employees successfully`,
      total: employees.length,
      importedCount: createdUsers.length,
      skippedCount: skippedCount + (validRecords.length - createdUsers.length),
      errors,
      createdUsers,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error during bulk employee import:', error);
    return NextResponse.json({ message: 'Bulk employee import failed', error: error.message }, { status: 500 });
  }
}
