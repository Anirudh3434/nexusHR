import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

export async function GET() {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr', 'manager'])) {
      return NextResponse.json({ message: 'Forbidden: Insufficient permissions to view field tracking' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const query: any = {
      date: { $gte: today, $lte: endOfDay },
    };

    if (auth.role !== 'super_admin' && auth.companyId) {
      query.companyId = auth.companyId;
    }

    const attendances = await Attendance.find(query)
      .populate({
        path: 'employeeId',
        model: User,
        select: 'name email department designation avatar phone',
      })
      .sort({ updatedAt: -1 })
      .lean();

    const formattedWorkers = attendances
      .filter((rec: any) => rec.employeeId) // Filter valid users
      .map((rec: any) => {
        const emp = rec.employeeId;
        const isCompleted = !!rec.checkOut?.time;
        const isOnBreak = !!rec.isOnBreak;
        const isActive = !!rec.checkIn?.time && !isCompleted;
        const isField = rec.workMode === 'field';

        let trackingState: 'active' | 'break' | 'wfh' | 'office' | 'completed' = 'office';
        if (isCompleted) {
          trackingState = 'completed';
        } else if (isOnBreak) {
          trackingState = 'break';
        } else if (rec.workMode === 'wfh') {
          trackingState = 'wfh';
        } else if (isField && isActive) {
          trackingState = 'active';
        } else if (isActive) {
          trackingState = 'office';
        }

        // Determine coordinates from lastLocation or fallback to checkIn location
        let rawLocation = (rec.lastLocation && typeof rec.lastLocation.lat === 'number')
          ? rec.lastLocation
          : (rec.checkIn?.location && typeof rec.checkIn.location.lat === 'number')
          ? {
              lat: rec.checkIn.location.lat,
              lng: rec.checkIn.location.lng,
              accuracy: 15,
              updatedAt: rec.updatedAt || rec.createdAt,
            }
          : null;

        // If on break, show where break was taken
        if (isOnBreak && rec.breaks && rec.breaks.length > 0) {
          const currentBreak = rec.breaks[rec.breaks.length - 1];
          if (currentBreak.startLocation && typeof currentBreak.startLocation.lat === 'number') {
            rawLocation = {
              lat: currentBreak.startLocation.lat,
              lng: currentBreak.startLocation.lng,
              accuracy: 10,
              updatedAt: rec.updatedAt,
            };
          }
        }

        // Expose coordinates for Field (live), Office (live), WFH (current location), and Break (break location)
        const canExposeCoords = (isActive || isOnBreak) && !!rawLocation;

        return {
          attendanceId: rec._id.toString(),
          employeeId: emp._id.toString(),
          name: emp.name,
          email: emp.email,
          department: emp.department || 'General',
          designation: emp.designation || 'Staff',
          avatar: emp.avatar,
          phone: emp.phone,
          workMode: rec.workMode || 'office',
          checkInTime: rec.checkIn?.time,
          checkOutTime: rec.checkOut?.time,
          isOnBreak,
          trackingState,
          lastLocation: canExposeCoords && rawLocation ? {
            lat: rawLocation.lat,
            lng: rawLocation.lng,
            accuracy: rawLocation.accuracy || 15,
            speed: rawLocation.speed || null,
            heading: rawLocation.heading || null,
            updatedAt: rawLocation.updatedAt,
          } : null,
          breaks: rec.breaks || [],
          breaksCount: rec.breaks?.length || 0,
        };
      });

    return NextResponse.json(formattedWorkers);
  } catch (error: any) {
    console.error('Field tracking fetch error:', error);
    return NextResponse.json({ message: 'Error fetching field tracking', error: error.message }, { status: 500 });
  }
}

