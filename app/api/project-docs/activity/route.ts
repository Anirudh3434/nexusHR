import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';
import Project from '@/models/Project';
import { headers } from 'next/headers';
import { getAuthInfo } from '@/lib/auth-util';

async function getDisplayName(): Promise<string> {
  try { return (await headers()).get('x-user-name') || ''; } catch { return ''; }
}

interface AuthCtx { userId: string; role: string; companyId?: string; email?: string; name?: string }

async function requireProjectAccess(projectId: string, auth: AuthCtx) {
  const project = await Project.findById(projectId).select('companyId managerId members');
  if (!project) return { error: 'Project not found', status: 404 as const };
  if (!auth.companyId || project.companyId.toString() !== auth.companyId) {
    return { error: "Forbidden: Access to another company's project is not allowed", status: 403 as const };
  }
  const userRole = auth.role || 'employee';
  if (userRole === 'employee') {
    const isMember = project.members.some(
      (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === auth.userId
    );
    if (!isMember) return { error: 'Forbidden: You are not a member of this project', status: 403 as const };
  } else if (userRole === 'manager') {
    const isManager = project.managerId && project.managerId.toString() === auth.userId;
    const isMember = project.members.some(
      (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === auth.userId
    );
    if (!isManager && !isMember) {
      return { error: 'Forbidden: You do not manage or belong to this project', status: 403 as const };
    }
  }
  return { project };
}

// POST - Log activity for project docs
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      projectId,
      action,
      resourceType,
      resourceId,
      resourceName,
      details
    } = body;
    // Identity always comes from the session — body userId/userName/userEmail ignored.

    if (!projectId || !action || !resourceType) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const activityLog = await ActivityLog.create({
      userId: auth.userId,
      userName: await getDisplayName(),
      userEmail: auth.email || '',
      projectId,
      companyId: auth.companyId,
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
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const resourceType = searchParams.get('resourceType');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

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
