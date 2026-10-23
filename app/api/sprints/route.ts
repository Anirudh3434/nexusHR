import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Sprint from '@/models/Sprint';
import Project from '@/models/Project';
import User from '@/models/User';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const WRITE_ROLES = ['super_admin', 'admin', 'hr'];

function hasMaliciousKeys(obj: Record<string, any>): boolean {
  return Object.keys(obj).some((k) => k.startsWith('$') || k.includes('.'));
}

// GET /api/sprints - Fetch sprints with filters
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const isSuperAdmin = auth.role === 'super_admin';
    const searchParams = request.nextUrl.searchParams;
    const queryCompanyId = searchParams.get('companyId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    if (queryCompanyId && !isSuperAdmin && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = isSuperAdmin ? (queryCompanyId || auth.companyId) : auth.companyId;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const filter: any = { companyId };
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;

    const sprints = await Sprint.find(filter)
      .populate('projectId', 'name projectNumber')
      .populate('createdBy', 'name email')
      .sort({ startDate: -1 });

    return NextResponse.json({ sprints }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sprints:', error);
    return NextResponse.json({ error: 'Failed to fetch sprints' }, { status: 500 });
  }
}

// POST /api/sprints - Create a new sprint
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const isSuperAdmin = auth.role === 'super_admin';
    const body = await request.json();
    if (hasMaliciousKeys(body)) return NextResponse.json({ error: 'Invalid keys' }, { status: 400 });
    const {
      name,
      description,
      projectId,
      companyId: bodyCompanyId,
      startDate,
      endDate,
      goals,
    } = body;

    if (bodyCompanyId && !isSuperAdmin && bodyCompanyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = isSuperAdmin ? (bodyCompanyId || auth.companyId) : auth.companyId;
    const createdBy = auth.userId;

    // Validation
    if (!name || !projectId || !companyId || !startDate || !endDate || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: name, projectId, companyId, startDate, endDate, createdBy' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify user exists
    const user = await User.findById(createdBy);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let count = await Sprint.countDocuments();
    let sprintNumber = `SPR-${String(count + 1).padStart(4, '0')}`;
    while (await Sprint.exists({ sprintNumber })) {
      count++;
      sprintNumber = `SPR-${String(count + 1).padStart(4, '0')}`;
    }

    const sprint = new Sprint({
      sprintNumber,
      name,
      description,
      projectId,
      companyId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      goals: goals || [],
      taskIds: [],
      totalTasks: 0,
      completedTasks: 0,
      storyPoints: 0,
      completedStoryPoints: 0,
      createdBy,
    });

    await sprint.save();

    return NextResponse.json({ sprint }, { status: 201 });
  } catch (error) {
    console.error('Error creating sprint:', error);
    return NextResponse.json({ error: 'Failed to create sprint' }, { status: 500 });
  }
}

// PATCH /api/sprints - Update sprint
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    if (hasMaliciousKeys(body)) return NextResponse.json({ error: 'Invalid keys' }, { status: 400 });
    const { sprintId, name, status, actualStartDate, actualEndDate, goals } = body;

    if (!sprintId) {
      return NextResponse.json({ error: 'Sprint ID is required' }, { status: 400 });
    }

    const existing = await Sprint.findById(sprintId);
    if (!existing) return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (actualStartDate) updateData.actualStartDate = new Date(actualStartDate);
    if (actualEndDate) updateData.actualEndDate = new Date(actualEndDate);
    if (goals) updateData.goals = goals;

    const sprint = await Sprint.findByIdAndUpdate(
      sprintId,
      { $set: updateData },
      { new: true }
    ).populate('projectId', 'name projectNumber');

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    return NextResponse.json({ sprint }, { status: 200 });
  } catch (error) {
    console.error('Error updating sprint:', error);
    return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 });
  }
}

// DELETE /api/sprints - Delete sprint
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const searchParams = request.nextUrl.searchParams;
    const sprintId = searchParams.get('sprintId');

    if (!sprintId) {
      return NextResponse.json({ error: 'Sprint ID is required' }, { status: 400 });
    }

    const existing = await Sprint.findById(sprintId);
    if (!existing) return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const sprint = await Sprint.findByIdAndDelete(sprintId);

    if (!sprint) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Sprint deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting sprint:', error);
    return NextResponse.json({ error: 'Failed to delete sprint' }, { status: 500 });
  }
}
