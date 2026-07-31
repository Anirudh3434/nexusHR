import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Onboarding from '@/models/Onboarding';
import { headers } from 'next/headers';
import { deriveOnboardingStatus } from '@/lib/onboardingTemplates';

const STAFF_ROLES = ['super_admin', 'admin', 'hr'];

// POST - Add a checklist task
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name') || '';
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.includes(userRole)) return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });

    const body = await req.json();
    const { title, description, category, assigneeRole, assignedTo, dueDate } = body;

    if (!title) {
      return NextResponse.json({ message: 'Task title is required' }, { status: 400 });
    }

    const record = await Onboarding.findById(id);
    if (!record) return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });

    record.checklist.push({
      title,
      description: description || '',
      category: category || 'HR',
      assigneeRole: assigneeRole || 'hr',
      assignedTo: assignedTo || null,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: 'pending',
      autoTask: false,
    });

    record.lastUpdatedBy = { _id: userId, name: userName, email: '' };
    record.activity.push({ userId, userName, action: 'task_added', details: `Added task: ${title}` });

    const derived = deriveOnboardingStatus(record);
    record.status = derived.status;
    record.progress = derived.progress;

    await record.save();

    return NextResponse.json({ message: 'Task added', onboarding: record }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding checklist task:', error);
    return NextResponse.json({ message: 'Error adding checklist task', error: error.message }, { status: 500 });
  }
}

// PATCH - Update a checklist task (status / notes / assignee)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name') || '';
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { taskId, status, notes, description, category, assigneeRole, assignedTo, dueDate, title } = body;

    if (!taskId) {
      return NextResponse.json({ message: 'taskId is required' }, { status: 400 });
    }

    const record = await Onboarding.findById(id);
    if (!record) return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });

    const task = record.checklist.find((t: any) => t._id.toString() === taskId);
    if (!task) return NextResponse.json({ message: 'Task not found' }, { status: 404 });

    // Employees can only update tasks assigned to them (category Employee or assigned to their user)
    if (userRole === 'employee') {
      const isAssignee = task.assigneeRole === 'employee' || (task.assignedTo && task.assignedTo.toString() === userId);
      if (!isAssignee) {
        return NextResponse.json({ message: 'You can only update tasks assigned to you' }, { status: 403 });
      }
    } else if (!STAFF_ROLES.includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (category !== undefined) task.category = category;
    if (assigneeRole !== undefined) task.assigneeRole = assigneeRole;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) task.notes = notes;

    if (status !== undefined) {
      task.status = status;
      if (status === 'completed') {
        task.completedBy = { _id: userId, name: userName };
        task.completedAt = new Date();
      } else if (status === 'cancelled') {
        task.completedBy = undefined;
        task.completedAt = undefined;
      }
    }

    record.lastUpdatedBy = { _id: userId, name: userName, email: '' };
    record.activity.push({ userId, userName, action: 'task_updated', details: `Updated task: ${task.title}` });

    const derived = deriveOnboardingStatus(record);
    record.status = derived.status;
    record.progress = derived.progress;

    await record.save();

    return NextResponse.json({ message: 'Task updated', onboarding: record });
  } catch (error: any) {
    console.error('Error updating checklist task:', error);
    return NextResponse.json({ message: 'Error updating checklist task', error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a checklist task (pending only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name') || '';
    const userRole = headersList.get('x-user-role') || 'employee';

    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!STAFF_ROLES.includes(userRole)) return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) return NextResponse.json({ message: 'taskId is required' }, { status: 400 });

    const record = await Onboarding.findById(id);
    if (!record) return NextResponse.json({ message: 'Onboarding record not found' }, { status: 404 });

    const task = record.checklist.find((t: any) => t._id.toString() === taskId);
    if (!task) return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    if (task.status !== 'pending') {
      return NextResponse.json({ message: 'Only pending tasks can be removed' }, { status: 400 });
    }

    record.checklist = record.checklist.filter((t: any) => t._id.toString() !== taskId);
    record.lastUpdatedBy = { _id: userId, name: userName, email: '' };
    record.activity.push({ userId, userName, action: 'task_removed', details: `Removed task: ${task.title}` });

    const derived = deriveOnboardingStatus(record);
    record.status = derived.status;
    record.progress = derived.progress;

    await record.save();

    return NextResponse.json({ message: 'Task removed', onboarding: record });
  } catch (error: any) {
    console.error('Error removing checklist task:', error);
    return NextResponse.json({ message: 'Error removing checklist task', error: error.message }, { status: 500 });
  }
}
