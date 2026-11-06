import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import mongoose from 'mongoose';
import { resolveUserContext, checkPermission } from '../auth';
import Task from '../../models/Task';
import Project from '../../models/Project';

export function registerTaskTools(server: McpServer) {
  // Tool: list_tasks
  server.tool(
    'list_tasks',
    'List project tasks. Employees only see their assigned tasks; Managers/HR/Admins can query across the project or company.',
    {
      status: z.enum(['backlog', 'to_do', 'in_progress', 'in_review', 'completed', 'cancelled', 'all']).optional().describe('Filter by task status'),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Filter by priority'),
      projectId: z.string().optional().describe('Filter by Project ObjectId'),
      limit: z.number().optional().default(20).describe('Maximum tasks to return (default 20)'),
    },
    async ({ status, priority, projectId, limit }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'tasks', 'view');
        if (!check.allowed) {
          return { content: [{ type: 'text', text: check.error || 'Access Denied' }], isError: true };
        }

        const query: any = {};
        if (user.companyId) query.companyId = user.companyId;

        // Employees only see their own tasks
        if (user.role === 'employee') {
          query.$or = [
            { assignedTo: user.id },
            { createdBy: user.id },
          ];
        }

        if (status && status !== 'all') query.status = status;
        if (priority) query.priority = priority;
        if (projectId) query.projectId = projectId;

        const tasks = await Task.find(query)
          .select('taskNumber title status priority dueDate estimatedHours actualHours assignedTo projectId')
          .populate('projectId', 'name projectNumber')
          .populate('assignedTo', 'name email')
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ count: tasks.length, tasks }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error listing tasks: ${err.message}` }], isError: true };
      }
    }
  );

  // Tool: create_task
  server.tool(
    'create_task',
    'Create a new task in a project. Requires task creation permission.',
    {
      projectId: z.string().describe('The Project ObjectId'),
      title: z.string().describe('Title of the task'),
      description: z.string().optional().describe('Detailed description'),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium').describe('Task priority'),
      status: z.enum(['backlog', 'to_do', 'in_progress']).default('to_do').describe('Initial task status'),
      assignedTo: z.array(z.string()).optional().describe('Array of User ObjectIds to assign'),
      dueDate: z.string().optional().describe('Due date (ISO string YYYY-MM-DD)'),
    },
    async ({ projectId, title, description, priority, status, assignedTo, dueDate }) => {
      try {
        const user = await resolveUserContext();
        const check = checkPermission(user, 'tasks', 'create');
        if (!check.allowed) {
          return { content: [{ type: 'text', text: check.error || 'Access Denied' }], isError: true };
        }

        const project = await Project.findById(projectId).select('name companyId').lean() as any;
        if (!project) {
          return { content: [{ type: 'text', text: `Project with ID ${projectId} not found.` }], isError: true };
        }

        const taskCount = await Task.countDocuments({ projectId });
        const taskNumber = `TSK-${Date.now().toString().slice(-4)}-${taskCount + 1}`;

        const newTask = await Task.create({
          taskNumber,
          title,
          description: description || '',
          projectId,
          companyId: user.companyId || project.companyId,
          createdBy: user.id,
          priority,
          status,
          assignedTo: assignedTo || [user.id],
          dueDate: dueDate ? new Date(dueDate) : undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Task created successfully',
                task: {
                  id: newTask._id.toString(),
                  taskNumber: newTask.taskNumber,
                  title: newTask.title,
                  status: newTask.status,
                  priority: newTask.priority,
                },
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error creating task: ${err.message}` }], isError: true };
      }
    }
  );

  // Tool: update_task_status
  server.tool(
    'update_task_status',
    'Update task status (e.g., to_do, in_progress, completed). Supports querying by ObjectId or Task Number (e.g. TSK26110001). Assignees or users with edit permission can update.',
    {
      taskId: z.string().describe('The Task ObjectId or Task Number (e.g., TSK26110001)'),
      status: z.enum(['backlog', 'to_do', 'in_progress', 'in_review', 'completed', 'cancelled']).describe('New status'),
      comment: z.string().optional().describe('Optional comment on the status change'),
    },
    async ({ taskId, status, comment }) => {
      try {
        const user = await resolveUserContext();
        
        let task: any = null;
        if (mongoose.Types.ObjectId.isValid(taskId) && taskId.length === 24) {
          task = await Task.findById(taskId);
        }
        if (!task) {
          task = await Task.findOne({
            $or: [
              { taskNumber: taskId },
              { taskNumber: taskId.toUpperCase() },
              { taskNumber: taskId.trim() },
            ],
          });
        }
        if (!task) {
          return { content: [{ type: 'text', text: `Task "${taskId}" not found.` }], isError: true };
        }

        const isAssigned = (task.assignedTo || []).some((id: any) => id.toString() === user.id);
        const hasEditPerm = checkPermission(user, 'tasks', 'edit').allowed;

        if (!isAssigned && !hasEditPerm) {
          return {
            content: [{ type: 'text', text: `Permission Denied: You are not assigned to this task and do not have edit permissions for tasks.` }],
            isError: true,
          };
        }

        // Backfill legacy creator if missing to ensure schema integrity
        if (!task.createdBy) {
          task.createdBy = task.assignedBy || (user.id as any);
        }
        if (!task.assignedBy) {
          task.assignedBy = (user.id as any);
        }

        task.status = status;
        if (comment) {
          task.comments = task.comments || [];
          task.comments.push({
            userId: user.id as any,
            userName: user.name,
            text: comment,
            createdAt: new Date(),
          } as any);
        }

        await task.save({ validateModifiedOnly: true });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: `Task ${task.taskNumber} updated to ${status}`,
                taskId: task._id.toString(),
                taskNumber: task.taskNumber,
                status: task.status,
              }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error updating task: ${err.message}` }], isError: true };
      }
    }
  );
}

