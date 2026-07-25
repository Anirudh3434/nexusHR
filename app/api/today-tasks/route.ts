import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import TodayTaskReport from '@/models/TodayTaskReport';
import Task from '@/models/Task';
import User from '@/models/User';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
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
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const user = await User.findById(userId).populate('workShiftId', 'name startTime endTime').lean();
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Determine shift end time and EOD unlock (30 mins before shift end)
    const shiftEndTime = (user?.workShiftId as any)?.endTime || '18:00';
    const [hStr, mStr] = shiftEndTime.split(':');
    const shiftEndMin = (parseInt(hStr, 10) || 18) * 60 + (parseInt(mStr, 10) || 0);
    const unlockMin = shiftEndMin - 30;

    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const isEodUnlocked = currentMin >= unlockMin;

    const unlockH = Math.floor(unlockMin / 60);
    const unlockM = unlockMin % 60;
    const unlockTimeStr = `${unlockH % 12 || 12}:${unlockM.toString().padStart(2, '0')} ${unlockH >= 12 ? 'PM' : 'AM'}`;

    // 1. Fetch assigned tasks for picking (available to the employee)
    const assignedTasks = await Task.find({
      companyId: user.companyId,
      assignedTo: { $in: [new mongoose.Types.ObjectId(userId)] },
      status: { $ne: 'completed' }
    }).select('_id taskNumber title status priority taskType projectId').lean();

    // 2. Fetch today's report for the current user
    let userReport = await TodayTaskReport.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date
    }).lean();

    // 3. If manager/admin, fetch all submitted reports for company
    let companyReports: any[] = [];
    if (userRole === 'admin' || userRole === 'hr' || userRole === 'manager') {
      companyReports = await TodayTaskReport.find({
        companyId: user.companyId,
        date
      }).sort({ updatedAt: -1 }).lean();
    }

    return NextResponse.json({
      date,
      userRole: user.role || userRole,
      shiftEndTime,
      unlockTimeStr,
      isEodUnlocked,
      assignedTasks,
      userReport,
      companyReports
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching today tasks:', error);
    return NextResponse.json({ message: 'Internal error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { date, items, action, employeeComment } = body; // action: 'save_draft' | 'submit'
    const reportDate = date || new Date().toISOString().split('T')[0];

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ message: 'Items array is required' }, { status: 400 });
    }

    // Calculate total estimated time in hours
    const timeToMinutes: { [key: string]: number } = {
      '15 mins': 15,
      '30 mins': 30,
      '45 mins': 45,
      '1 hr': 60,
      '2 hrs': 120,
      '3 hrs': 180,
      '4 hrs': 240,
      '6 hrs': 360,
      '8 hrs': 480
    };

    const totalMinutes = items.reduce((sum: number, item: any) => {
      return sum + (timeToMinutes[item.estimateTime] || 0);
    }, 0);
    const totalHours = totalMinutes / 60;

    // If submitting and less than 8 hours, require comment
    if (action === 'submit' && totalHours < 8 && !employeeComment) {
      return NextResponse.json({
        message: 'Work time is less than 8 hours. Please add a comment for your manager before submitting.',
        requiresComment: true,
        totalHours
      }, { status: 400 });
    }

    const status = action === 'submit' ? 'submitted' : 'draft';
    const submittedAt = action === 'submit' ? new Date() : undefined;

    // Set edit window to 1 hour after submission
    const editWindowExpiresAt = action === 'submit' ? new Date(Date.now() + 60 * 60 * 1000) : undefined;

    const updatedReport = await TodayTaskReport.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), date: reportDate },
      {
        $set: {
          userId: new mongoose.Types.ObjectId(userId),
          userName: user.name,
          userEmail: user.email,
          companyId: user.companyId,
          date: reportDate,
          items,
          status,
          ...(submittedAt ? { submittedAt } : {}),
          ...(employeeComment ? { employeeComment } : {}),
          ...(editWindowExpiresAt ? { editWindowExpiresAt } : {})
        }
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: action === 'submit' ? "Today's Task & EOD Report submitted to manager successfully!" : "Draft saved successfully",
      report: updatedReport
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error saving today tasks report:', error);
    return NextResponse.json({ message: 'Internal error', error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { reportId, taskId, action } = body;

    // Add comment (both employee and manager)
    if (action === 'add_comment' && reportId) {
      const { content } = body;
      if (!content) {
        return NextResponse.json({ message: 'Comment content is required' }, { status: 400 });
      }

      const report = await TodayTaskReport.findOne({
        _id: new mongoose.Types.ObjectId(reportId),
        companyId: user.companyId
      });

      if (!report) {
        return NextResponse.json({ message: 'Report not found' }, { status: 404 });
      }

      const newComment = {
        id: new mongoose.Types.ObjectId().toString(),
        userId: new mongoose.Types.ObjectId(userId),
        userName: user.name,
        content,
        createdAt: new Date(),
        isManager: userRole === 'admin' || userRole === 'hr' || userRole === 'manager'
      };

      report.comments.push(newComment);
      await report.save();

      return NextResponse.json({
        message: 'Comment added successfully',
        report
      }, { status: 200 });
    }

    // Manager adding task to employee's plan
    if (action === 'add_task_to_employee' && reportId) {
      if (userRole !== 'admin' && userRole !== 'hr' && userRole !== 'manager') {
        return NextResponse.json({ message: 'Unauthorized - only managers can add tasks' }, { status: 403 });
      }

      const { task } = body; // task: { taskId, taskNumber, title, currentStatus, estimateTime }
      if (!task) {
        return NextResponse.json({ message: 'Task data is required' }, { status: 400 });
      }

      const report = await TodayTaskReport.findOne({
        _id: new mongoose.Types.ObjectId(reportId),
        companyId: user.companyId
      });

      if (!report) {
        return NextResponse.json({ message: 'Report not found' }, { status: 404 });
      }

      // Check if edit window is still open
      if (report.editWindowExpiresAt && new Date() > report.editWindowExpiresAt) {
        return NextResponse.json({ message: 'Edit window has expired. Cannot add tasks.' }, { status: 400 });
      }

      // Add the new task
      const newTaskItem = {
        taskId: new mongoose.Types.ObjectId(task.taskId),
        taskNumber: task.taskNumber,
        title: task.title,
        currentStatus: task.currentStatus,
        estimateTime: task.estimateTime || '1 hr',
        eodStatus: 'in_progress' as const,
        eodRemarks: '',
        eodStatusHistory: []
      };

      report.items.push(newTaskItem);
      await report.save();

      return NextResponse.json({
        message: 'Task added successfully',
        report
      }, { status: 200 });
    }

    // Request edit window
    if (action === 'request_edit' && reportId) {
      const report = await TodayTaskReport.findOne({
        _id: new mongoose.Types.ObjectId(reportId),
        companyId: user.companyId
      });

      if (!report) {
        return NextResponse.json({ message: 'Report not found' }, { status: 404 });
      }

      // Extend edit window by 1 hour
      report.editWindowExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      report.editRequestedBy = new mongoose.Types.ObjectId(userId);
      report.editRequestedAt = new Date();
      await report.save();

      return NextResponse.json({
        message: 'Edit window extended successfully',
        report
      }, { status: 200 });
    }

    // Manager approving/rejecting the entire report
    if (action === 'manager_approval' && reportId) {
      if (userRole !== 'admin' && userRole !== 'hr' && userRole !== 'manager') {
        return NextResponse.json({ message: 'Unauthorized - only managers can approve reports' }, { status: 403 });
      }

      const { approval, remarks } = body; // approval: 'approved' | 'rejected' | 'changes_requested'

      const report = await TodayTaskReport.findOne({
        _id: new mongoose.Types.ObjectId(reportId),
        companyId: user.companyId
      });

      if (!report) {
        return NextResponse.json({ message: 'Report not found' }, { status: 404 });
      }

      report.managerApproval = approval;
      report.managerRemarks = remarks;
      report.managerApprovedAt = new Date();
      report.managerApprovedBy = new mongoose.Types.ObjectId(userId);

      await report.save();

      return NextResponse.json({
        message: `Report ${approval} successfully`,
        report
      }, { status: 200 });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error updating today tasks report:', error);
    return NextResponse.json({ message: 'Internal error', error: error.message }, { status: 500 });
  }
}
