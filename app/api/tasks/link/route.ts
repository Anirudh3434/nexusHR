import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import Project from '@/models/Project';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

// Verify the caller may write to this task: same-company + project membership
// (same pattern as projects/[id] GET).
async function requireTaskProjectAccess(task: any, userId: string, userRole: string, companyId: string | null): Promise<string | null> {
  if (!companyId || task.companyId?.toString() !== companyId) {
    return "Forbidden: task belongs to another company";
  }
  const project = await Project.findById(task.projectId).select('companyId managerId members');
  if (!project) return 'Project not found';
  if (project.companyId.toString() !== companyId) {
    return "Forbidden: Access to another company's project is not allowed";
  }
  if (userRole === 'employee') {
    const isMember = project.members.some(
      (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === userId
    );
    if (!isMember) return 'Forbidden: You are not a member of this project';
  } else if (userRole === 'manager') {
    const isManager = project.managerId && project.managerId.toString() === userId;
    const isMember = project.members.some(
      (m: any) => m.employeeId && (m.employeeId._id || m.employeeId).toString() === userId
    );
    if (!isManager && !isMember) return 'Forbidden: You do not manage or belong to this project';
  }
  return null;
}

// POST - Link two tasks reciprocally
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');

    const body = await req.json();
    const { taskId, targetTaskId, linkType } = body;

    if (!taskId || !targetTaskId || !linkType) {
      return NextResponse.json({
        message: 'taskId, targetTaskId, and linkType are required'
      }, { status: 400 });
    }

    if (taskId === targetTaskId) {
      return NextResponse.json({ message: 'Cannot link a task to itself' }, { status: 400 });
    }

    const task = await Task.findById(taskId);
    const targetTask = await Task.findById(targetTaskId);

    if (!task || !targetTask) {
      return NextResponse.json({ message: 'One or both tasks not found' }, { status: 404 });
    }

    for (const t of [task, targetTask]) {
      const accessError = await requireTaskProjectAccess(t, userId, userRole, companyId);
      if (accessError) return NextResponse.json({ message: accessError }, { status: 403 });
    }

    // Initialize arrays if they don't exist
    if (!task.dependsOn) task.dependsOn = [];
    if (!task.blocks) task.blocks = [];
    if (!task.relatesTo) task.relatesTo = [];
    if (!task.duplicates) task.duplicates = [];
    if (!task.isDuplicatedBy) task.isDuplicatedBy = [];
    if (!targetTask.dependsOn) targetTask.dependsOn = [];
    if (!targetTask.blocks) targetTask.blocks = [];
    if (!targetTask.relatesTo) targetTask.relatesTo = [];
    if (!targetTask.duplicates) targetTask.duplicates = [];
    if (!targetTask.isDuplicatedBy) targetTask.isDuplicatedBy = [];

    const taskObjId = new mongoose.Types.ObjectId(taskId);
    const targetTaskObjId = new mongoose.Types.ObjectId(targetTaskId);

    if (linkType === 'dependsOn') {
      // task depends on targetTask (targetTask blocks task)
      if (!task.dependsOn.some(id => id.toString() === targetTaskId)) {
        task.dependsOn.push(targetTaskObjId);
      }
      if (!targetTask.blocks.some(id => id.toString() === taskId)) {
        targetTask.blocks.push(taskObjId);
      }
    } else if (linkType === 'blocks') {
      // task blocks targetTask (targetTask depends on task)
      if (!task.blocks.some(id => id.toString() === targetTaskId)) {
        task.blocks.push(targetTaskObjId);
      }
      if (!targetTask.dependsOn.some(id => id.toString() === taskId)) {
        targetTask.dependsOn.push(taskObjId);
      }
    } else if (linkType === 'relatesTo') {
      // task relates to targetTask (reciprocal)
      if (!task.relatesTo.some(id => id.toString() === targetTaskId)) {
        task.relatesTo.push(targetTaskObjId);
      }
      if (!targetTask.relatesTo.some(id => id.toString() === taskId)) {
        targetTask.relatesTo.push(taskObjId);
      }
    } else if (linkType === 'duplicates') {
      // task duplicates targetTask
      if (!task.duplicates.some(id => id.toString() === targetTaskId)) {
        task.duplicates.push(targetTaskObjId);
      }
      if (!targetTask.isDuplicatedBy.some(id => id.toString() === taskId)) {
        targetTask.isDuplicatedBy.push(taskObjId);
      }
    } else if (linkType === 'isDuplicatedBy') {
      // task is duplicated by targetTask
      if (!task.isDuplicatedBy.some(id => id.toString() === targetTaskId)) {
        task.isDuplicatedBy.push(targetTaskObjId);
      }
      if (!targetTask.duplicates.some(id => id.toString() === taskId)) {
        targetTask.duplicates.push(taskObjId);
      }
    } else {
      return NextResponse.json({ message: 'Invalid linkType' }, { status: 400 });
    }

    await task.save();
    await targetTask.save();

    return NextResponse.json({ 
      message: 'Tasks linked successfully'
    });
  } catch (error: any) {
    console.error('Error linking tasks:', error);
    return NextResponse.json({ message: 'Error linking tasks', error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a reciprocal link
export async function DELETE(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const targetTaskId = searchParams.get('targetTaskId');
    const linkType = searchParams.get('linkType');

    if (!taskId || !targetTaskId || !linkType) {
      return NextResponse.json({
        message: 'taskId, targetTaskId, and linkType are required'
      }, { status: 400 });
    }

    const task = await Task.findById(taskId);
    const targetTask = await Task.findById(targetTaskId);

    if (!task || !targetTask) {
      return NextResponse.json({ message: 'One or both tasks not found' }, { status: 404 });
    }

    for (const t of [task, targetTask]) {
      const accessError = await requireTaskProjectAccess(t, userId, userRole, companyId);
      if (accessError) return NextResponse.json({ message: accessError }, { status: 403 });
    }

    if (linkType === 'dependsOn') {
      // task depends on targetTask
      task.dependsOn = task.dependsOn?.filter(id => id.toString() !== targetTaskId) || [];
      targetTask.blocks = targetTask.blocks?.filter(id => id.toString() !== taskId) || [];
    } else if (linkType === 'blocks') {
      // task blocks targetTask
      task.blocks = task.blocks?.filter(id => id.toString() !== targetTaskId) || [];
      targetTask.dependsOn = targetTask.dependsOn?.filter(id => id.toString() !== taskId) || [];
    } else if (linkType === 'relatesTo') {
      // task relates to targetTask (reciprocal)
      task.relatesTo = task.relatesTo?.filter(id => id.toString() !== targetTaskId) || [];
      targetTask.relatesTo = targetTask.relatesTo?.filter(id => id.toString() !== taskId) || [];
    } else if (linkType === 'duplicates') {
      // task duplicates targetTask
      task.duplicates = task.duplicates?.filter(id => id.toString() !== targetTaskId) || [];
      targetTask.isDuplicatedBy = targetTask.isDuplicatedBy?.filter(id => id.toString() !== taskId) || [];
    } else if (linkType === 'isDuplicatedBy') {
      // task is duplicated by targetTask
      task.isDuplicatedBy = task.isDuplicatedBy?.filter(id => id.toString() !== targetTaskId) || [];
      targetTask.duplicates = targetTask.duplicates?.filter(id => id.toString() !== taskId) || [];
    } else {
      return NextResponse.json({ message: 'Invalid linkType' }, { status: 400 });
    }

    await task.save();
    await targetTask.save();

    return NextResponse.json({ 
      message: 'Link removed successfully'
    });
  } catch (error: any) {
    console.error('Error removing link:', error);
    return NextResponse.json({ message: 'Error removing link', error: error.message }, { status: 500 });
  }
}
