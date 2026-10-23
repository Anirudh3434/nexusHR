import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectNote from '@/models/ProjectNote';
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

// PATCH - Update note
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

    const note = await ProjectNote.findById(id);
    if (!note) {
      return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(note.projectId.toString(), auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    const actor = { _id: auth.userId, name: await getDisplayName(), email: auth.email || '' };

    // Track version if content changed
    if (body.content !== undefined && body.content !== note.content) {
      const newVersion = note.versions.length + 1;
      note.versions.push({
        version: newVersion,
        content: body.content,
        editedBy: actor,
        editedAt: new Date(),
        changeNotes: body.changeNotes
      });
    }

    // Update fields (explicit allowlist — no body spread)
    if (body.title !== undefined) note.title = body.title;
    if (body.content !== undefined) note.content = body.content;
    if (body.tags !== undefined) note.tags = body.tags;
    if (body.category !== undefined) note.category = body.category;
    if (body.isPinned !== undefined) note.isPinned = body.isPinned;
    if (body.isFavorite !== undefined) note.isFavorite = body.isFavorite;
    note.lastEditedBy = actor;

    note.updatedAt = new Date();
    await note.save();

    return NextResponse.json({ note }, { status: 200 });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ message: 'Failed to update note' }, { status: 500 });
  }
}

// DELETE - Delete note
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const existing = await ProjectNote.findById(id);
    if (!existing) {
      return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    const access = await requireProjectAccess(existing.projectId.toString(), auth);
    if ('error' in access) return NextResponse.json({ message: access.error }, { status: access.status });

    await ProjectNote.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ message: 'Failed to delete note' }, { status: 500 });
  }
}
