import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import { headers } from 'next/headers';

// GET - Fetch a single project by ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    // In Next.js 15, params is a Promise that must be awaited
    const { id } = await params;
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const project = await Project.findById(id)
      .populate('managerId', 'name email department avatar')
      .populate('members.employeeId', 'name email department avatar')
      .populate('createdBy', 'name email');
      
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }
    
    // Ensure the project belongs to the user's company
    if (project.companyId.toString() !== companyId) {
      return NextResponse.json({ message: 'Forbidden: Access to another company\'s project is not allowed' }, { status: 403 });
    }
    
    // Role-based access validation
    if (userRole === 'employee') {
      // Employees must be assigned to the project
      const isMember = project.members.some(
        (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === userId
      );
      if (!isMember) {
        return NextResponse.json({ message: 'Forbidden: You are not a member of this project' }, { status: 403 });
      }
    } else if (userRole === 'manager') {
      // Managers must manage the project or be assigned to it
      const isManager = project.managerId.toString() === userId;
      const isMember = project.members.some(
        (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === userId
      );
      if (!isManager && !isMember) {
        return NextResponse.json({ message: 'Forbidden: You do not manage or belong to this project' }, { status: 403 });
      }
    }
    
    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { message: 'Error fetching project', error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update project details
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId || userRole === 'employee') {
      return NextResponse.json({ message: 'Unauthorized or Forbidden' }, { status: 401 });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    );

    return NextResponse.json({ project: updatedProject });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ message: 'Error updating project', error: error.message }, { status: 500 });
  }
}
