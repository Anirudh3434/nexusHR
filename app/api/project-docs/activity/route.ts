import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';

// POST - Log activity for project docs
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const {
      userId,
      userName,
      userEmail,
      projectId,
      action,
      resourceType,
      resourceId,
      resourceName,
      details
    } = body;

    if (!userId || !action || !resourceType) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const activityLog = await ActivityLog.create({
      userId,
      userName,
      userEmail,
      projectId,
      action,
      resourceType,
      resourceId,
      resourceName,
      details,
      timestamp: new Date()
    });

    return NextResponse.json({ activityLog }, { status: 201 });
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json({ message: 'Failed to log activity' }, { status: 500 });
  }
}

// GET - Fetch activity logs for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const resourceType = searchParams.get('resourceType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const query: any = { projectId };
    if (resourceType) query.resourceType = resourceType;

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset);

    const total = await ActivityLog.countDocuments(query);

    return NextResponse.json({ logs, total, limit, offset }, { status: 200 });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ message: 'Failed to fetch activity logs' }, { status: 500 });
  }
}
