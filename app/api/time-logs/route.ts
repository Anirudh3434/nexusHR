import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TimeLog from '@/models/TimeLog';
import Task from '@/models/Task';
import { headers } from 'next/headers';

// Generate time log number helper
async function generateTimeLogNumber(): Promise<string> {
  const date = new Date();
  const prefix = 'TLOG';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  const count = await TimeLog.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), 1),
    },
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `${prefix}${year}${month}${sequence}`;
}

// GET - Fetch time logs
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
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {};

    // Role-based filtering
    if (userRole === 'employee') {
      // Employees can only see their own time logs
      query.companyId = companyId;
      query.employeeId = userId;
    } else if (userRole === 'manager') {
      // Managers can see time logs for their team members' tasks
      query.companyId = companyId;
    } else {
      // Admin/HR can see all company time logs
      query.companyId = companyId;
    }

    if (taskId) query.taskId = taskId;
    if (projectId) query.projectId = projectId;
    if (status) query.status = status;
    if (startDate) query.startTime = { $gte: new Date(startDate) };
    if (endDate) query.startTime = { ...query.startTime, $lte: new Date(endDate) };

    const timeLogs = await TimeLog.find(query)
      .populate('taskId', 'taskNumber title')
      .populate('projectId', 'name projectNumber')
      .populate('employeeId', 'name email department')
      .sort({ startTime: -1 });

    return NextResponse.json({ timeLogs });
  } catch (error: any) {
    console.error('Error fetching time logs:', error);
    return NextResponse.json({ message: 'Error fetching time logs', error: error.message }, { status: 500 });
  }
}

// POST - Create new time log (start timer)
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { taskId, projectId, description } = body;

    // Validation
    if (!taskId || !projectId) {
      return NextResponse.json({ 
        message: 'Missing required fields',
        required: ['taskId', 'projectId']
      }, { status: 400 });
    }

    // Check if user has a running timer
    const runningTimer = await TimeLog.findOne({
      employeeId: userId,
      status: 'running'
    });

    if (runningTimer) {
      return NextResponse.json({ 
        message: 'You already have a running timer. Please stop it first.' 
      }, { status: 400 });
    }

    // Verify task exists and user is assigned
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    if (task.assignedTo && task.assignedTo.toString() !== userId) {
      return NextResponse.json({ 
        message: 'You are not assigned to this task' 
      }, { status: 403 });
    }

    const logNumber = await generateTimeLogNumber();

    const timeLog = await TimeLog.create({
      logNumber,
      taskId,
      projectId,
      employeeId: userId,
      startTime: new Date(),
      status: 'running',
      description: description || '',
      companyId: companyId || body.companyId,
    });

    const populatedTimeLog = await TimeLog.findById(timeLog._id)
      .populate('taskId', 'taskNumber title')
      .populate('projectId', 'name projectNumber')
      .populate('employeeId', 'name email department');

    return NextResponse.json({ 
      message: 'Timer started successfully',
      timeLog: populatedTimeLog 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error starting timer:', error);
    return NextResponse.json({ message: 'Error starting timer', error: error.message }, { status: 500 });
  }
}

// PATCH - Update time log (stop timer or update)
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
    const { logId, action, description } = body;

    if (!logId) {
      return NextResponse.json({ message: 'Time log ID is required' }, { status: 400 });
    }

    const timeLog = await TimeLog.findById(logId);

    if (!timeLog) {
      return NextResponse.json({ message: 'Time log not found' }, { status: 404 });
    }

    // Check permissions
    if (userRole === 'employee' && timeLog.employeeId.toString() !== userId) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    // Handle stop timer action
    if (action === 'stop' && timeLog.status === 'running') {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - timeLog.startTime.getTime()) / (1000 * 60)); // in minutes

      const updatedTimeLog = await TimeLog.findByIdAndUpdate(
        logId,
        { 
          $set: { 
            endTime, 
            duration, 
            status: 'completed' 
          } 
        },
        { new: true }
      )
        .populate('taskId', 'taskNumber title')
        .populate('projectId', 'name projectNumber')
        .populate('employeeId', 'name email department');

      // Update task actual hours
      await Task.findByIdAndUpdate(timeLog.taskId, {
        $inc: { actualHours: duration / 60 } // Convert to hours
      });

      return NextResponse.json({ 
        message: 'Timer stopped successfully',
        timeLog: updatedTimeLog 
      });
    }

    // Handle description update
    if (description !== undefined) {
      const updatedTimeLog = await TimeLog.findByIdAndUpdate(
        logId,
        { $set: { description } },
        { new: true }
      )
        .populate('taskId', 'taskNumber title')
        .populate('projectId', 'name projectNumber')
        .populate('employeeId', 'name email department');

      return NextResponse.json({ 
        message: 'Time log updated successfully',
        timeLog: updatedTimeLog 
      });
    }

    return NextResponse.json({ message: 'No valid action provided' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating time log:', error);
    return NextResponse.json({ message: 'Error updating time log', error: error.message }, { status: 500 });
  }
}

// DELETE - Delete time log
export async function DELETE(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const logId = searchParams.get('logId');

    if (!logId) {
      return NextResponse.json({ message: 'Time log ID is required' }, { status: 400 });
    }

    const timeLog = await TimeLog.findById(logId);

    if (!timeLog) {
      return NextResponse.json({ message: 'Time log not found' }, { status: 404 });
    }

    // Check permissions
    if (userRole === 'employee' && timeLog.employeeId.toString() !== userId) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    // If deleting a completed log, subtract hours from task
    if (timeLog.status === 'completed' && timeLog.duration) {
      await Task.findByIdAndUpdate(timeLog.taskId, {
        $inc: { actualHours: -(timeLog.duration / 60) }
      });
    }

    await TimeLog.findByIdAndDelete(logId);

    return NextResponse.json({ message: 'Time log deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting time log:', error);
    return NextResponse.json({ message: 'Error deleting time log', error: error.message }, { status: 500 });
  }
}
