import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

// GET all employees
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');

    if (queryCompanyId && auth.role !== 'super_admin' && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = auth.role === 'super_admin' ? (queryCompanyId || auth.companyId) : auth.companyId;
    
    const query: any = {};
    if (companyId) query.companyId = companyId;
    else if (auth.role !== 'super_admin') {
      return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    }
    
    const employees = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Transform _id to id for frontend parity
    const formattedEmployees = employees.map(emp => ({
      ...emp.toObject(),
      id: emp._id.toString(),
      _id: undefined,
      password: undefined,
    }));

    return NextResponse.json(formattedEmployees);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching employees', error: error.message }, { status: 500 });
  }
}

// POST create a new employee
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const data = await req.json();
    
    console.log('Creating employee with data:', { ...data, password: '***' });

    const { email, password, name, role, department, designation, salary, workShiftId, phone, joiningDate } = data;
    // companyId ALWAYS from session (super_admin may pass explicit when session has none)
    if (data.companyId && auth.role !== 'super_admin' && data.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = auth.role === 'super_admin' ? (auth.companyId || data.companyId) : auth.companyId;
    if (!companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    if (!email || !password || !name) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const allowedRoles = ['admin', 'hr', 'manager', 'employee'];
    if (role && !allowedRoles.includes(role)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Build user data object
    const userData: any = {
      name,
      email,
      password: hashedPassword,
      role: role || 'employee',
      department,
      designation,
      phone,
      salary: salary ? Number(salary) : undefined,
      workShiftId: workShiftId || undefined,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      isActive: true,
      status: 'Active',
    };
    
    // companyId forced from session
    userData.companyId = companyId;

    const newUser = await User.create(userData);
    
    console.log('Employee created:', newUser._id.toString());

    return NextResponse.json({
      message: 'Employee created successfully',
      id: newUser._id,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ message: 'Error creating employee', error: error.message }, { status: 500 });
  }
}

// PATCH update employee
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const data = await req.json();
    const { id, ...updateData } = data;
    
    console.log('[Employee API] Patching employee:', { id, ...updateData });

    if (!id) {
      return NextResponse.json({ message: 'Employee ID required' }, { status: 400 });
    }

    // NEVER role/salary/companyId/password via PATCH
    if ('role' in updateData || 'salary' in updateData || 'companyId' in updateData || 'password' in updateData) {
      return NextResponse.json({ message: 'role, salary, companyId and password cannot be updated via PATCH' }, { status: 400 });
    }

    // Strict allowlist
    const allowedFields = ['name', 'phone', 'department', 'designation', 'workShiftId', 'joiningDate', 'isActive', 'status', 'avatar'];
    const sanitized: any = {};
    for (const key of allowedFields) {
      if (key in updateData && updateData[key] !== undefined) sanitized[key] = updateData[key];
    }

    // Remove empty workShiftId to prevent ObjectId cast error
    if (sanitized.workShiftId === '' || sanitized.workShiftId === null) {
      delete sanitized.workShiftId;
    }
    if (sanitized.joiningDate) sanitized.joiningDate = new Date(sanitized.joiningDate);

    const employee = await User.findById(id);
    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }
    // Same-company check
    if (auth.role !== 'super_admin' && employee.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    // Apply allowlisted updates only
    Object.keys(sanitized).forEach(key => {
      // @ts-ignore
      employee[key] = sanitized[key];
    });

    const updatedUser = await employee.save();

    return NextResponse.json({
      message: 'Employee updated successfully',
      employee: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ message: 'Error updating employee', error: error.message }, { status: 500 });
  }
}
