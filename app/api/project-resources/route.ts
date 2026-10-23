import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectResource from '@/models/ProjectResource';
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

function rejectDollarKeys(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  return Object.keys(obj).some((k) => k.startsWith('$'));
}

// GET - Fetch all resources for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags');
    const isFavorite = searchParams.get('isFavorite');

    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const query: any = { projectId };

    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };
    if (isFavorite === 'true') query.isFavorite = true;

    const resources = await ProjectResource.find(query)
      .sort({ isFavorite: -1, updatedAt: -1 });

    return NextResponse.json({ resources }, { status: 200 });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json({ message: 'Failed to fetch resources' }, { status: 500 });
  }
}

// POST - Create a new resource
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (rejectDollarKeys(body)) {
      return NextResponse.json({ message: 'Invalid field names' }, { status: 400 });
    }
    const { projectId, title, url, description, category, tags, isFavorite } = body;
    // Client-supplied userId/userName/userEmail are ignored — session identity only.

    if (!projectId || !title || !url) {
      return NextResponse.json({ message: 'Project ID, title, and URL are required' }, { status: 400 });
    }

    const access = await requireProjectAccess(projectId, auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const actor = { _id: auth.userId, name: await getDisplayName(), email: auth.email || '' };

    const resource = await ProjectResource.create({
      projectId,
      title,
      url,
      description,
      category: category || 'Other',
      tags: tags || [],
      isFavorite: isFavorite || false,
      createdBy: actor,
      lastUpdatedBy: actor
    });

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json({ message: 'Failed to create resource' }, { status: 500 });
  }
}
