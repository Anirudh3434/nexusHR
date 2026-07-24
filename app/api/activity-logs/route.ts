import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';
import { headers } from 'next/headers';

// GET - Fetch activity logs with filtering
export async function GET(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');
    
    if (!userId || !companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');
    const actionType = searchParams.get('actionType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query
    const query: any = { 
      companyId,
      isArchived: false 
    };
    
    if (taskId) query.taskId = taskId;
    if (projectId) query.projectId = projectId;
    if (actionType) query.actionType = actionType;
    
    // Fetch activity logs
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();
    
    // Get total count
    const total = await ActivityLog.countDocuments(query);
    
    return NextResponse.json({ logs, total });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ message: 'Failed to fetch activity logs' }, { status: 500 });
  }
}

// POST - Create activity log
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name');
    const companyId = headersList.get('x-company-id');
    
    if (!userId || !companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { taskId, projectId, actionType, fieldName, oldValue, newValue, description, metadata } = body;
    
    if (!taskId || !projectId || !actionType) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    const log = await ActivityLog.create({
      taskId,
      projectId,
      companyId,
      userId,
      userName: userName || 'Unknown User',
      actionType,
      fieldName,
      oldValue,
      newValue,
      description,
      metadata: metadata || {},
    });
    
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('Error creating activity log:', error);
    return NextResponse.json({ message: 'Failed to create activity log' }, { status: 500 });
  }
}
