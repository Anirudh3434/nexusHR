import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import Project from '@/models/Project';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import VersionSnapshot from '@/models/VersionSnapshot';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

// Generate task number helper
async function generateTaskNumber(): Promise<string> {
  const date = new Date();
  const prefix = 'TSK';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Find the highest task number for this month
  const monthPrefix = `${prefix}${year}${month}`;
  const lastTask = await Task.findOne({
    taskNumber: { $regex: `^${monthPrefix}` }
  }).sort({ taskNumber: -1 });
  
  let sequence = 1;
  if (lastTask && lastTask.taskNumber) {
    // Extract sequence number from last task number
    const lastSequence = parseInt(lastTask.taskNumber.slice(-4));
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }
  
  const sequenceStr = sequence.toString().padStart(4, '0');
  return `${prefix}${year}${month}${sequenceStr}`;
}

// GET - Fetch tasks
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
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const parentId = searchParams.get('parentId');
    
    const searchQuery = searchParams.get('searchQuery');
    const taskType = searchParams.get('taskType');
    const label = searchParams.get('labels');
    const epic = searchParams.get('epic');
    const dueDate = searchParams.get('dueDate');
    const storyPoints = searchParams.get('storyPoints');

    const query: any = {};

    // Role-based filtering
    if (projectId) {
      query.projectId = projectId;
      if (companyId) query.companyId = companyId;
    } else if (userRole === 'employee') {
      // Employees can only see their assigned tasks when no specific project is requested
      query.companyId = companyId;
      query.assignedTo = { $in: [new mongoose.Types.ObjectId(userId)] };
    } else if (userRole === 'manager') {
      // Managers can see tasks they assigned or are assigned to
      query.companyId = companyId;
      query.$or = [
        { assignedBy: userId },
        { assignedTo: { $in: [new mongoose.Types.ObjectId(userId)] } }
      ];
    } else {
      // Admin/HR can see all company tasks
      query.companyId = companyId;
    }

    if (searchQuery) {
      const searchOr = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchOr }
        ];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    if (taskType) {
      const taskTypes = taskType.split(',').filter(Boolean);
      if (taskTypes.length > 0) {
        query.taskType = { $in: taskTypes };
      }
    }

    if (status) {
      if (status !== 'all') {
        const statuses = status.split(',').filter(Boolean);
        if (statuses.length > 0) {
          query.status = { $in: statuses };
        }
      }
    } else {
      // Exclude backlog tasks from main tasks endpoint by default
      query.status = { $ne: 'backlog' };
    }

    if (priority) {
      const priorities = priority.split(',').filter(Boolean);
      if (priorities.length > 0) {
        query.priority = { $in: priorities };
      }
    }

    if (assignedTo) {
      const assignees = assignedTo.split(',').filter(Boolean);
      if (assignees.length > 0) {
        query.assignedTo = { $in: assignees.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    if (label) {
      const labelIds = label.split(',').filter(Boolean);
      if (labelIds.length > 0) {
        query.labels = { $in: labelIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    if (epic) {
      const epicIds = epic.split(',').filter(Boolean);
      if (epicIds.length > 0) {
        query.parentId = { $in: epicIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    } else if (parentId) {
      if (parentId === 'null' || parentId === 'none') {
        query.parentId = { $exists: false };
      } else {
        query.parentId = parentId;
      }
    }

    if (dueDate) {
      query.dueDate = { $lte: new Date(dueDate) };
    }

    if (storyPoints) {
      query.storyPoints = { $gte: parseFloat(storyPoints) };
    }
    // If status === 'all', don't filter by status at all

    const tasks = await Task.find(query)
      .populate('projectId', 'name projectNumber')
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name email')
      .populate('dependsOn', 'taskNumber title status')
      .populate('blocks', 'taskNumber title status')
      .populate('parentId', 'taskNumber title status')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('GET tasks - sample task with customStatus:', tasks[0] ? JSON.stringify(tasks[0].customStatus, null, 2) : 'No tasks');

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ message: 'Error fetching tasks', error: error.message }, { status: 500 });
  }
}

// POST - Create new task
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
    
    // Only admin/HR/manager can create tasks
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    
    const body = await req.json();
    console.log('Task creation request body:', body);
    
    const {
      title,
      description,
      status,
      priority,
      taskType,
      projectId,
      assignedTo,
      startDate,
      dueDate,
      estimatedHours,
      actualHours,
      storyPoints,
      dependsOn,
      tags,
      assignedBy,
      parentId,
      attachments,
      labels,
      sprintId,
      customStatus
    } = body;

    // Validation
    if (!title) {
      return NextResponse.json({ 
        message: 'Missing required field: title',
        required: ['title']
      }, { status: 400 });
    }
    
    if (!projectId) {
      return NextResponse.json({ 
        message: 'Missing required field: projectId',
        receivedBody: body
      }, { status: 400 });
    }

    const taskNumber = await generateTaskNumber();

    const task = await Task.create({
      taskNumber,
      title,
      description: description || '',
      status: status || 'to_do',
      priority: priority || 'medium',
      taskType: taskType || 'task',
      projectId,
      assignedTo: Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []),
      assignedBy: userId,
      startDate,
      dueDate,
      estimatedHours,
      actualHours: actualHours || 0,
      storyPoints: storyPoints || undefined,
      dependsOn: dependsOn || [],
      tags: tags || [],
      companyId: companyId || body.companyId,
      createdBy: userId,
      progressPercentage: 0,
      parentId: parentId || undefined,
      attachments: attachments || [],
      labels: labels || [],
      sprintId: sprintId || undefined,
      customStatus: customStatus || undefined,
    });

    // Log activity for task creation
    await ActivityLog.create({
      taskId: task._id,
      projectId,
      companyId: companyId || body.companyId,
      userId,
      userName: headersList.get('x-user-name') || 'Unknown User',
      actionType: 'created',
      description: `Created task ${taskNumber}`,
      metadata: {
        taskNumber,
        title,
        status: status || 'to_do',
        priority: priority || 'medium',
      },
    });

    const populatedTask = await Task.findById(task._id)
      .populate('projectId', 'name projectNumber')
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name email')
      .populate('dependsOn', 'taskNumber title status')
      .populate('parentId', 'taskNumber title status')
      .populate('createdBy', 'name email');

    return NextResponse.json({ 
      message: 'Task created successfully',
      task: populatedTask 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ message: 'Error creating task', error: error.message }, { status: 500 });
  }
}

// PATCH - Update task
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
    const { taskId, attachments, ...updateData } = body;

    console.log('PATCH task - body:', JSON.stringify(body, null, 2));
    console.log('PATCH task - updateData:', JSON.stringify(updateData, null, 2));
    console.log('PATCH task - customStatus:', JSON.stringify(updateData.customStatus, null, 2));

    if (!taskId) {
      return NextResponse.json({ message: 'Task ID is required' }, { status: 400 });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    // Resolve custom status ID to system status and customStatus object
    if (updateData.status && (updateData.status.startsWith('custom-') || updateData.status.startsWith('custom_') || !['backlog', 'to_do', 'in_progress', 'in_review', 'completed', 'cancelled'].includes(updateData.status))) {
      const project = await Project.findById(task.projectId);
      if (project && project.board && project.board.columns) {
        let foundCustomStatus: any = null;
        let parentColumnStatus: string | null = null;
        const lookupId = updateData.status.replace('custom-', '');

        project.board.columns.forEach((col: any) => {
          if (col.customStatuses) {
            const found = col.customStatuses.find((s: any) => s.id === lookupId || s.id === updateData.status);
            if (found) {
              foundCustomStatus = found;
              parentColumnStatus = col.status;
            }
          }
        });

        if (foundCustomStatus && parentColumnStatus) {
          updateData.customStatus = {
            id: foundCustomStatus.id,
            name: foundCustomStatus.name,
            color: foundCustomStatus.color
          };
          updateData.status = parentColumnStatus;
        }
      }
    }

    // Validate status transition against project's allowedTransitions
    if (updateData.status && updateData.status !== task.status) {
      const project = await Project.findById(task.projectId);
      if (project && project.board && project.board.columns) {
        // Find the current status column
        const currentColumn = project.board.columns.find((col: any) => col.status === task.status);
        
        if (currentColumn && currentColumn.allowedTransitions) {
          // Check if the new status is in the allowed transitions
          if (!currentColumn.allowedTransitions.includes(updateData.status)) {
            return NextResponse.json({ 
              message: `Status transition from "${task.status}" to "${updateData.status}" is not allowed according to project workflow rules`,
              error: 'TRANSITION_NOT_ALLOWED'
            }, { status: 403 });
          }
        }
      }
    }

    // Track field changes for activity logging
    const changes: Array<{ fieldName: string; oldValue: any; newValue: any; actionType: string; metadata?: any }> = [];
    
    if (updateData.title && updateData.title !== task.title) {
      changes.push({
        fieldName: 'title',
        oldValue: task.title,
        newValue: updateData.title,
        actionType: 'updated'
      });
    }

    if (updateData.description !== undefined && updateData.description !== task.description) {
      changes.push({
        fieldName: 'description',
        oldValue: task.description || '',
        newValue: updateData.description || '',
        actionType: 'updated'
      });
    }

    const oldStatusVal = task.customStatus && task.customStatus.name ? task.customStatus : task.status;
    const newCustomStatus = updateData.customStatus !== undefined ? updateData.customStatus : task.customStatus;
    const newStatusVal = newCustomStatus && newCustomStatus.name ? newCustomStatus : (updateData.status || task.status);

    if (JSON.stringify(oldStatusVal) !== JSON.stringify(newStatusVal)) {
      changes.push({
        fieldName: 'status',
        oldValue: oldStatusVal,
        newValue: newStatusVal,
        actionType: 'status_changed'
      });
    }
    
    if (updateData.priority && updateData.priority !== task.priority) {
      changes.push({
        fieldName: 'priority',
        oldValue: task.priority,
        newValue: updateData.priority,
        actionType: 'priority_changed'
      });
    }
    
    if (updateData.assignedTo && JSON.stringify(updateData.assignedTo) !== JSON.stringify(task.assignedTo)) {
      changes.push({
        fieldName: 'assignee',
        oldValue: task.assignedTo,
        newValue: updateData.assignedTo,
        actionType: 'assignee_changed'
      });
    }
    
    if (updateData.dueDate) {
      const oldDueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null;
      const newDueDate = updateData.dueDate;
      if (oldDueDate !== newDueDate) {
        changes.push({
          fieldName: 'dueDate',
          oldValue: oldDueDate,
          newValue: newDueDate,
          actionType: 'due_date_changed'
        });
      }
    }
    
    // Removed redundant customStatus tracking in favor of unified status tracking
    
    if (updateData.sprintId && updateData.sprintId !== task.sprintId) {
      changes.push({
        fieldName: 'sprintId',
        oldValue: task.sprintId,
        newValue: updateData.sprintId,
        actionType: 'sprint_changed'
      });
    }
    
    // Track label changes
    if (updateData.labels && JSON.stringify(updateData.labels) !== JSON.stringify(task.labels)) {
      const oldLabels = task.labels || [];
      const newLabels = updateData.labels || [];
      
      // Improved comparison that handles both _id and name matching
      const addedLabels = newLabels.filter((l: any) => {
        return !oldLabels.some((ol: any) => {
          if (l._id && ol._id) return l._id === ol._id;
          return l.name === ol.name;
        });
      });
      
      const removedLabels = oldLabels.filter((ol: any) => {
        return !newLabels.some((l: any) => {
          if (ol._id && l._id) return ol._id === l._id;
          return ol.name === l.name;
        });
      });
      
      if (addedLabels.length > 0) {
        changes.push({
          fieldName: 'labels',
          oldValue: oldLabels,
          newValue: addedLabels,
          actionType: 'label_added',
          metadata: { operation: 'added', labels: addedLabels }
        });
      }
      
      if (removedLabels.length > 0) {
        changes.push({
          fieldName: 'labels',
          oldValue: removedLabels,
          newValue: newLabels,
          actionType: 'label_removed',
          metadata: { operation: 'removed', labels: removedLabels }
        });
      }
    }

    // Track attachment changes
    if (attachments && Array.isArray(attachments)) {
      const oldAttachments = task.attachments || [];
      const added = attachments.filter((att: any) => !oldAttachments.some((oldAtt: any) => oldAtt.url === att.url));
      const removed = oldAttachments.filter((oldAtt: any) => !attachments.some((att: any) => att.url === oldAtt.url));

      added.forEach((att: any) => {
        changes.push({
          fieldName: 'attachments',
          oldValue: null,
          newValue: att.name || att.url,
          actionType: 'attachment_added'
        });
      });

      removed.forEach((oldAtt: any) => {
        changes.push({
          fieldName: 'attachments',
          oldValue: oldAtt.name || oldAtt.url,
          newValue: null,
          actionType: 'attachment_removed'
        });
      });
    }

    // Check permissions
    if (userRole === 'employee') {
      // Employees can update tasks if assigned OR if member of the project team
      const isAssigned = task.assignedTo && Array.isArray(task.assignedTo) 
        ? task.assignedTo.some(id => (id._id || id).toString() === userId)
        : ((task.assignedTo as any)?._id || task.assignedTo)?.toString() === userId;

      const project = await Project.findById(task.projectId);
      const isProjectMember = project?.members?.some((m: any) => ((m.employeeId as any)?._id || m.employeeId)?.toString() === userId) || project?.managerId?.toString() === userId;
      
      if (!isAssigned && !isProjectMember) {
        return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      }
      // Employees can only update status, progress, and comments
      const allowedFields = ['status', 'progressPercentage', 'customStatus', 'comment', 'comments'];
      const invalidFields = Object.keys(updateData).filter(key => !allowedFields.includes(key));
      if (invalidFields.length > 0) {
        return NextResponse.json({
          message: 'Employees can only update status and progress'
        }, { status: 403 });
      }
    }

    // Automated comment creation when moving ticket status or providing comment
    const isStatusChanged = (updateData.status && updateData.status !== task.status) || 
      (updateData.customStatus !== undefined && JSON.stringify(updateData.customStatus) !== JSON.stringify(task.customStatus));
    
    if (isStatusChanged || body.comment) {
      let userName = headersList.get('x-user-name');
      if (!userName || userName === 'Unknown User') {
        const u = await User.findById(userId).select('name');
        userName = u?.name || 'Team Member';
      }

      const oldStatusRaw = task.customStatus?.id ? `custom-${task.customStatus.id}` : task.status;
      const newStatusRaw = updateData.customStatus?.id ? `custom-${updateData.customStatus.id}` : (updateData.status || task.status);

      const oldStatusName = task.customStatus?.name || (task.status ? task.status.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN');
      const newStatusName = updateData.customStatus?.name || (updateData.status ? updateData.status.replace(/_/g, ' ').toUpperCase() : oldStatusName);
      
      const newCommentsList: any[] = [...(task.comments || [])];

      // Check project autoCommentRules
      const project = await Project.findById(task.projectId);
      let matchedRuleComment = false;

      if (project && project.autoCommentRules && project.autoCommentRules.length > 0 && isStatusChanged) {
        // Find assigned user names for {{assignee}} variable
        let assigneeNames = 'Unassigned';
        if (task.assignedTo && task.assignedTo.length > 0) {
          const assignees = await User.find({ _id: { $in: task.assignedTo } }).select('name');
          assigneeNames = assignees.map(a => `@${a.name}`).join(', ') || 'Unassigned';
        }

        project.autoCommentRules.forEach((rule: any) => {
          if (!rule.enabled) return;
          const matchFrom = rule.fromStatus === 'any' || rule.fromStatus === oldStatusRaw || rule.fromStatus === task.status || rule.fromStatus === oldStatusName.toLowerCase();
          const matchTo = rule.toStatus === 'any' || rule.toStatus === newStatusRaw || rule.toStatus === updateData.status || rule.toStatus === newStatusName.toLowerCase();

          if (matchFrom && matchTo) {
            let renderedText = rule.template || '';
            renderedText = renderedText.replace(/\{\{\s*from_status\s*\}\}/gi, oldStatusName);
            renderedText = renderedText.replace(/\{\{\s*to_status\s*\}\}/gi, newStatusName);
            renderedText = renderedText.replace(/\{\{\s*task_number\s*\}\}/gi, task.taskNumber || '');
            renderedText = renderedText.replace(/\{\{\s*task_title\s*\}\}/gi, task.title || '');
            renderedText = renderedText.replace(/\{\{\s*user_name\s*\}\}/gi, userName || 'Team Member');
            renderedText = renderedText.replace(/\{\{\s*assignee\s*\}\}/gi, assigneeNames);
            renderedText = renderedText.replace(/@@/g, '@');

            newCommentsList.push({
              userId: new mongoose.Types.ObjectId(userId),
              userName,
              text: renderedText,
              createdAt: new Date(),
            });
            matchedRuleComment = true;
          }
        });
      }

      if (body.comment) {
        newCommentsList.push({
          userId: new mongoose.Types.ObjectId(userId),
          userName,
          text: body.comment,
          createdAt: new Date(),
        });
      } else if (!matchedRuleComment && isStatusChanged) {
        newCommentsList.push({
          userId: new mongoose.Types.ObjectId(userId),
          userName,
          text: `Moved ticket status from "${oldStatusName}" to "${newStatusName}"`,
          createdAt: new Date(),
        });
      }

      updateData.comments = newCommentsList;
    }

    // Auto-update completedAt when status changes to completed
    if (updateData.status === 'completed' && task.status !== 'completed') {
      updateData.completedAt = new Date();
      
      // Create version snapshot for task completion
      await VersionSnapshot.create({
        taskId,
        projectId: task.projectId,
        companyId: task.companyId,
        userId,
        userName: headersList.get('x-user-name') || 'Unknown User',
        reason: 'completion',
        description: `Task ${task.taskNumber} completed`,
        taskData: task.toObject(),
      });
    }
    
    // Create version snapshot for sprint changes
    if (updateData.sprintId && updateData.sprintId !== task.sprintId) {
      await VersionSnapshot.create({
        taskId,
        projectId: task.projectId,
        companyId: task.companyId,
        userId,
        userName: headersList.get('x-user-name') || 'Unknown User',
        reason: 'sprint_change',
        description: `Task ${task.taskNumber} moved to different sprint`,
        taskData: task.toObject(),
      });
    }

    // Handle attachments - overwrite with provided array
    if (attachments && Array.isArray(attachments)) {
      updateData.attachments = attachments;
    }

    console.log("PATCH taskId:", taskId, "updateData:", JSON.stringify(updateData, null, 2));

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('projectId', 'name projectNumber')
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name email')
      .populate('dependsOn', 'taskNumber title status')
      .populate('blocks', 'taskNumber title status')
      .populate('parentId', 'taskNumber title status')
      .populate('createdBy', 'name email');

    console.log("PATCH updated task labels:", updatedTask?.labels);

    // Log activity for each tracked change
    for (const change of changes) {
      // Generate a description that fits within 500 character limit
      let description = `Changed ${change.fieldName}`;
      if (change.oldValue !== undefined && change.newValue !== undefined) {
        const oldStr = typeof change.oldValue === 'string' ? change.oldValue : JSON.stringify(change.oldValue);
        const newStr = typeof change.newValue === 'string' ? change.newValue : JSON.stringify(change.newValue);
        
        // Truncate values if they're too long
        const maxLength = 200; // Leave room for "from" and "to"
        const truncatedOld = oldStr.length > maxLength ? oldStr.substring(0, maxLength) + '...' : oldStr;
        const truncatedNew = newStr.length > maxLength ? newStr.substring(0, maxLength) + '...' : newStr;
        
        description = `Changed ${change.fieldName} from ${truncatedOld} to ${truncatedNew}`;
      }
      
      // Ensure final description doesn't exceed 500 characters
      if (description.length > 500) {
        description = description.substring(0, 497) + '...';
      }

      await ActivityLog.create({
        taskId,
        projectId: task.projectId,
        companyId: task.companyId,
        userId,
        userName: headersList.get('x-user-name') || 'Unknown User',
        actionType: change.actionType as any,
        fieldName: change.fieldName,
        oldValue: change.oldValue,
        newValue: change.newValue,
        description,
        metadata: change.metadata,
      });
    }

    // Log general update if no specific changes tracked
    if (changes.length === 0) {
      await ActivityLog.create({
        taskId,
        projectId: task.projectId,
        companyId: task.companyId,
        userId,
        userName: headersList.get('x-user-name') || 'Unknown User',
        actionType: 'updated',
        description: 'Updated task',
      });
    }

    return NextResponse.json({ 
      message: 'Task updated successfully',
      task: updatedTask 
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json({ message: 'Error updating task', error: error.message }, { status: 500 });
  }
}

// DELETE - Delete task
export async function DELETE(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Only admin/HR/manager can delete tasks
    if (!['admin', 'hr', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }
    
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ message: 'Task ID is required' }, { status: 400 });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    // Log activity for task deletion before deleting
    await ActivityLog.create({
      taskId,
      projectId: task.projectId,
      companyId: task.companyId,
      userId,
      userName: headersList.get('x-user-name') || 'Unknown User',
      actionType: 'deleted',
      description: `Deleted task ${task.taskNumber}`,
      metadata: {
        taskNumber: task.taskNumber,
        title: task.title,
        status: task.status,
      },
    });

    // Create version snapshot before deletion
    await VersionSnapshot.create({
      taskId,
      projectId: task.projectId,
      companyId: task.companyId,
      userId,
      userName: headersList.get('x-user-name') || 'Unknown User',
      reason: 'deletion',
      description: `Task ${task.taskNumber} deleted`,
      taskData: task.toObject(),
    });

    await Task.findByIdAndDelete(taskId);

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ message: 'Error deleting task', error: error.message }, { status: 500 });
  }
}
