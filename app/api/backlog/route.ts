import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

// GET - Fetch backlog tasks
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

    const query: any = {
      $and: [
        {
          $or: [
            { status: 'backlog' },
            { sprintId: { $exists: true, $ne: null } }
          ]
        }
      ]
    };

    // Role-based filtering
    if (projectId) {
      query.projectId = projectId;
      if (companyId) query.companyId = companyId;
    } else if (userRole === 'employee') {
      // Employees can only see their assigned backlog tasks when no project is specified
      query.companyId = companyId;
      query.assignedTo = { $in: [new mongoose.Types.ObjectId(userId)] };
    } else if (userRole === 'manager') {
      // Managers can see backlog tasks they assigned or are assigned to
      query.companyId = companyId;
      query.$and.push({
        $or: [
          { assignedBy: userId },
          { assignedTo: { $in: [new mongoose.Types.ObjectId(userId)] } }
        ]
      });
    } else {
      // Admin/HR can see all company backlog tasks
      query.companyId = companyId;
    }

    const searchQuery = searchParams.get('searchQuery');
    const taskType = searchParams.get('taskType');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo') || searchParams.get('assignee');
    const label = searchParams.get('labels');
    const epic = searchParams.get('epic');
    const dueDate = searchParams.get('dueDate');
    const storyPoints = searchParams.get('storyPoints');

    if (searchQuery) {
      query.$and.push({
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { taskNumber: { $regex: searchQuery, $options: 'i' } }
        ]
      });
    }
    if (taskType) {
      const taskTypes = taskType.split(',').filter(Boolean);
      if (taskTypes.length > 0) {
        query.taskType = { $in: taskTypes };
      }
    }
    if (status) {
      const statuses = status.split(',').filter(Boolean);
      if (statuses.length > 0) {
        query.status = { $in: statuses };
      }
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
        const validObjectIds = assignees
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id));
        if (validObjectIds.length > 0) {
          query.assignedTo = { $in: validObjectIds };
        }
      }
    }
    if (label) {
      const labelItems = label.split(',').filter(Boolean);
      if (labelItems.length > 0) {
        const objectIdMatches = labelItems
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id));
        query.$and.push({
          $or: [
            { 'labels._id': { $in: objectIdMatches } },
            { 'labels.name': { $in: labelItems } },
            { labels: { $in: labelItems } }
          ]
        });
      }
    }
    if (epic) {
      const epicIds = epic.split(',').filter(Boolean);
      if (epicIds.length > 0) {
        query.parentId = { $in: epicIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }
    if (dueDate) {
      query.dueDate = { $lte: new Date(dueDate) };
    }
    if (storyPoints) {
      query.storyPoints = { $gte: parseFloat(storyPoints) };
    }

    const tasks = await Task.find(query)
      .populate('projectId', 'name projectNumber')
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name email')
      .populate('dependsOn', 'taskNumber title status')
      .populate('blocks', 'taskNumber title status')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('Error fetching backlog tasks:', error);
    return NextResponse.json({ message: 'Error fetching backlog tasks', error: error.message }, { status: 500 });
  }
}
