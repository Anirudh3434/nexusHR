import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import { getAuthInfo } from '@/lib/auth-util';
import { emitToRoom } from '@/lib/socketEmit';

function formatCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, reason } = body; // action: 'start' | 'end'

    if (!action || (action !== 'start' && action !== 'end')) {
      return NextResponse.json({ message: 'Invalid action. Must be "start" or "end".' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      employeeId: auth.userId,
      date: { $gte: today, $lte: endOfDay },
    });

    if (!attendance) {
      return NextResponse.json({ message: 'No active shift found for today. Please clock in first.' }, { status: 404 });
    }

    if (attendance.checkOut?.time) {
      return NextResponse.json({ message: 'Shift already ended for today.' }, { status: 400 });
    }

    const currentTime = formatCurrentTime();

    if (action === 'start') {
      if (attendance.isOnBreak) {
        return NextResponse.json({ message: 'Already on break', isOnBreak: true, breaks: attendance.breaks });
      }

      attendance.isOnBreak = true;
      if (!attendance.breaks) attendance.breaks = [];
      attendance.breaks.push({
        startTime: currentTime,
        reason: reason || 'General Break',
      });

      await attendance.save();

      // Notify company management room and user room
      if (auth.companyId) {
        emitToRoom(`field-tracking:${auth.companyId}`, 'employee-status-ping', {
          employeeId: auth.userId,
          employeeName: (auth as any).name || 'Employee',
          status: 'break',
          timestamp: new Date().toISOString(),
        });
      }

      emitToRoom(auth.userId, 'attendance-updated', {
        employeeId: auth.userId,
        isOnBreak: true,
        breaks: attendance.breaks,
      });

      return NextResponse.json({
        success: true,
        message: 'Break started. Location tracking paused.',
        isOnBreak: true,
        breaks: attendance.breaks,
      });
    } else {
      // action === 'end'
      if (!attendance.isOnBreak) {
        return NextResponse.json({ message: 'Not currently on break', isOnBreak: false, breaks: attendance.breaks });
      }

      attendance.isOnBreak = false;
      if (attendance.breaks && attendance.breaks.length > 0) {
        const lastBreak = attendance.breaks[attendance.breaks.length - 1];
        if (!lastBreak.endTime) {
          lastBreak.endTime = currentTime;
          const startM = timeToMinutes(lastBreak.startTime);
          const endM = timeToMinutes(currentTime);
          lastBreak.duration = Math.max(0, endM - startM);
        }
      }

      await attendance.save();

      // Notify company management room and user room
      if (auth.companyId) {
        emitToRoom(`field-tracking:${auth.companyId}`, 'employee-status-ping', {
          employeeId: auth.userId,
          employeeName: (auth as any).name || 'Employee',
          status: 'active',
          timestamp: new Date().toISOString(),
        });
      }

      emitToRoom(auth.userId, 'attendance-updated', {
        employeeId: auth.userId,
        isOnBreak: false,
        breaks: attendance.breaks,
      });

      return NextResponse.json({
        success: true,
        message: 'Break ended. Shift resumed.',
        isOnBreak: false,
        breaks: attendance.breaks,
      });
    }
  } catch (error: any) {
    console.error('Break toggle error:', error);
    return NextResponse.json({ message: 'Error toggling break', error: error.message }, { status: 500 });
  }
}
