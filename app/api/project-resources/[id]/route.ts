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

// PATCH - Update resource
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    if (rejectDollarKeys(body)) {
      return NextResponse.json({ message: 'Invalid field names' }, { status: 400 });
    }

    const resource = await ProjectResource.findById(id);
    if (!resource) {
      return NextResponse.json({ message: 'Resource not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(resource.projectId.toString(), auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    // Update fields (explicit allowlist — identity from session)
    if (body.title !== undefined) resource.title = body.title;
    if (body.url !== undefined) resource.url = body.url;
    if (body.description !== undefined) resource.description = body.description;
    if (body.category !== undefined) resource.category = body.category;
    if (body.tags !== undefined) resource.tags = body.tags;
    if (body.isFavorite !== undefined) resource.isFavorite = body.isFavorite;
    resource.lastUpdatedBy = { _id: auth.userId, name: await getDisplayName(), email: auth.email || '' };

    resource.updatedAt = new Date();
    await resource.save();

    return NextResponse.json({ resource }, { status: 200 });
  } catch (error) {
    console.error('Error updating resource:', error);
    return NextResponse.json({ message: 'Failed to update resource' }, { status: 500 });
  }
}

// DELETE - Delete resource
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const existing = await ProjectResource.findById(id);
    if (!existing) {
      return NextResponse.json({ message: 'Resource not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(existing.projectId.toString(), auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    await ProjectResource.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Resource deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json({ message: 'Failed to delete resource' }, { status: 500 });
  }
}
