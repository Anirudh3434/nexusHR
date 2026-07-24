import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

// GET all employees
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    
    const query: any = {};
    if (companyId) query.companyId = companyId;
    
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
    const data = await req.json();
    
    console.log('Creating employee with data:', { ...data, password: '***' });

    const { email, password, name, role, department, designation, companyId, salary, workShiftId, phone, joiningDate } = data;

    if (!email || !password || !name) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

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
    
    // Only add companyId if it's provided and valid
    if (companyId && companyId !== 'null' && companyId !== 'undefined') {
      userData.companyId = companyId;
    }

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
    const data = await req.json();
    const { id, ...updateData } = data;
    
    console.log('[Employee API] Patching employee:', { id, ...updateData });

    if (!id) {
      return NextResponse.json({ message: 'Employee ID required' }, { status: 400 });
    }

    // Convert salary to number if provided
    if (updateData.salary) {
      updateData.salary = Number(updateData.salary);
    }

    // Remove empty workShiftId to prevent ObjectId cast error
    if (updateData.workShiftId === '' || updateData.workShiftId === null) {
      delete updateData.workShiftId;
    }

    const employee = await User.findById(id);
    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    // Apply updates
    Object.keys(updateData).forEach(key => {
      // @ts-ignore
      employee[key] = updateData[key];
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
