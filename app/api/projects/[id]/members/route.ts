import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import { headers } from 'next/headers';

// GET - Fetch project members
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
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
      .populate('members.employeeId', 'name email department avatar');
      
    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }
    
    // Ensure the project belongs to the user's company
    if (project.companyId.toString() !== companyId) {
      return NextResponse.json({ message: 'Forbidden: Access to another company\'s project is not allowed' }, { status: 403 });
    }
    
    // Role-based access validation
    if (userRole === 'employee') {
      const isMember = project.members.some(
        (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === userId
      );
      if (!isMember) {
        return NextResponse.json({ message: 'Forbidden: You are not a member of this project' }, { status: 403 });
      }
    } else if (userRole === 'manager') {
      const isManager = project.managerId.toString() === userId;
      const isMember = project.members.some(
        (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === userId
      );
      if (!isManager && !isMember) {
        return NextResponse.json({ message: 'Forbidden: You do not manage or belong to this project' }, { status: 403 });
      }
    }
    
    // Extract members from the project
    const members = project.members
      .filter((m: any) => m.employeeId)
      .map((m: any) => {
        const employee = m.employeeId._id ? m.employeeId : m.employeeId;
        return {
          id: employee._id?.toString() || employee.toString(),
          name: employee.name || 'Unknown',
          email: employee.email || '',
          department: employee.department || '',
          avatar: employee.avatar || ''
        };
      });
    
    // Also include the manager if not already in members
    if (project.managerId) {
      const managerId = project.managerId._id?.toString() || project.managerId.toString();
      const isManagerInMembers = members.some((m: any) => m.id === managerId);
      
      if (!isManagerInMembers) {
        // Check if managerId is populated (has name property) or just an ObjectId
        const manager = project.managerId as any;
        const managerData = manager.name 
          ? manager 
          : { name: 'Manager', email: '', department: '', avatar: '' };
        
        members.push({
          id: managerId,
          name: managerData.name || 'Manager',
          email: managerData.email || '',
          department: managerData.department || '',
          avatar: managerData.avatar || ''
        });
      }
    }
    
    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Error fetching project members:', error);
    return NextResponse.json(
      { message: 'Error fetching project members', error: error.message },
      { status: 500 }
    );
  }
}
