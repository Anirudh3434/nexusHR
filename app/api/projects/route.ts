import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import { headers } from 'next/headers';

// Generate project number helper
async function generateProjectNumber(): Promise<string> {
  const date = new Date();
  const prefix = 'PRJ';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  const count = await Project.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), 1),
    },
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `${prefix}${year}${month}${sequence}`;
}

// GET - Fetch projects
export async function GET(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const managerId = searchParams.get('managerId');
    const department = searchParams.get('department');

    const query: any = {};

    // Role-based filtering
    if (userRole === 'employee') {
      // Employees can only see projects they're assigned to
      query.companyId = companyId;
      query['members.employeeId'] = userId;
    } else if (userRole === 'manager') {
      // Managers can see projects they manage or are assigned to
      query.companyId = companyId;
      query.$or = [
        { managerId: userId },
        { 'members.employeeId': userId }
      ];
    } else {
      // Admin/HR can see all company projects
      query.companyId = companyId;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (managerId) query.managerId = managerId;
    if (department) query.department = department;

    const projects = await Project.find(query)
      .populate('managerId', 'name email department')
      .populate('members.employeeId', 'name email department')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ message: 'Error fetching projects', error: error.message }, { status: 500 });
  }
}

// POST - Create new project
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Only admin/HR/manager can create projects
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await req.json();
    const { 
      name, 
      description, 
      status, 
      priority,
      startDate, 
      endDate,
      managerId,
      members,
      budget,
      currency,
      department,
      clientName,
      clientContact,
      milestones,
      board,
      useSprints,
      boardType,
      boardColumns
    } = body;

    // Validation
    if (!name) {
      return NextResponse.json({ 
        message: 'Missing required fields',
        required: ['name']
      }, { status: 400 });
    }

    const projectNumber = await generateProjectNumber();

    const project = await Project.create({
      projectNumber,
      name,
      description: description || '',
      status: status || 'planning',
      priority: priority || 'medium',
      startDate: startDate || null,
      endDate: endDate || null,
      managerId: managerId || userId,
      members: members || [],
      budget: budget || null,
      currency: currency || 'USD',
      department,
      clientName,
      clientContact,
      milestones: milestones || [],
      companyId: companyId || body.companyId,
      createdBy: userId,
      progressPercentage: 0,
      board: board || null,
      useSprints: useSprints || false,
    });

    const populatedProject = await Project.findById(project._id)
      .populate('managerId', 'name email department')
      .populate('members.employeeId', 'name email department')
      .populate('createdBy', 'name email');

    return NextResponse.json({ 
      message: 'Project created successfully',
      project: populatedProject 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ message: 'Error creating project', error: error.message }, { status: 500 });
  }
}

// PATCH - Update project
export async function PATCH(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { projectId, ...updateData } = body;

    console.log('PATCH project - body:', JSON.stringify(body, null, 2));
    console.log('PATCH project - updateData:', JSON.stringify(updateData, null, 2));

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const project = await Project.findById(projectId);
    console.log('PATCH project - existing project board:', JSON.stringify(project?.board, null, 2));

    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Check permissions
    if (userRole === 'employee') {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $set: updateData },
      { new: true }
    )
      .populate('managerId', 'name email department')
      .populate('members.employeeId', 'name email department')
      .populate('createdBy', 'name email');

    console.log('PATCH project - updated project board:', JSON.stringify(updatedProject?.board, null, 2));

    return NextResponse.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ message: 'Error updating project', error: error.message }, { status: 500 });
  }
}

// DELETE - Delete project
export async function DELETE(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Only admin/HR can delete projects
    if (!['admin', 'hr'].includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    await Project.findByIdAndDelete(projectId);

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ message: 'Error deleting project', error: error.message }, { status: 500 });
  }
}
