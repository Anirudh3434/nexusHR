import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import WorkShift from '@/models/WorkShift';
import Company from '@/models/Company';

// GET attendance records
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const companyId = searchParams.get('companyId');
    const date = searchParams.get('date');

    let query: any = {};
    if (employeeId) query.employeeId = employeeId;
    if (companyId) query.companyId = companyId;
    if (date) query.date = date;

    const attendance = await Attendance.find(query)
      .populate('employeeId', 'name department designation')
      .sort({ date: -1 });

    const formattedAttendance = attendance.map(record => {
      const rec = record.toObject();
      return {
        ...rec,
        id: record._id.toString(),
        employeeName: rec.employeeId?.name || 'Unknown',
        employeeId: rec.employeeId?._id?.toString() || rec.employeeId?.toString(),
        _id: undefined,
      };
    });

    return NextResponse.json(formattedAttendance);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching attendance', error: error.message }, { status: 500 });
  }
}

// Helper: Parse time string to minutes
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Check if employee is late based on shift
async function checkLateStatus(employeeId: string, checkInTime: string) {
  try {
    // Get employee with their shift
    const employee = await User.findById(employeeId);
    if (!employee || !employee.workShiftId) {
      return { isLate: false, lateMinutes: 0, shiftStartTime: null, shiftEndTime: null, workShiftId: null, shiftDuration: 0 };
    }

    // Get shift details
    const shift = await WorkShift.findById(employee.workShiftId);
    if (!shift) {
      return { isLate: false, lateMinutes: 0, shiftStartTime: null, shiftEndTime: null, workShiftId: employee.workShiftId, shiftDuration: 0 };
    }

    const shiftStartMinutes = timeToMinutes(shift.startTime);
    const shiftEndMinutes = timeToMinutes(shift.endTime);
    const checkInMinutes = timeToMinutes(checkInTime);
    const lateThreshold = shift.lateThreshold || 15; // default 15 min grace
    const shiftDuration = shiftEndMinutes - shiftStartMinutes;

    // Calculate allowed check-in time (shift start + grace period)
    const allowedCheckInMinutes = shiftStartMinutes + lateThreshold;

    if (checkInMinutes > allowedCheckInMinutes) {
      const lateMinutes = checkInMinutes - shiftStartMinutes;
      return {
        isLate: true,
        lateMinutes,
        shiftStartTime: shift.startTime,
        shiftEndTime: shift.endTime,
        workShiftId: shift._id,
        shiftDuration,
      };
    }

    return {
      isLate: false,
      lateMinutes: 0,
      shiftStartTime: shift.startTime,
      shiftEndTime: shift.endTime,
      workShiftId: shift._id,
      shiftDuration,
    };
  } catch (error) {
    console.error('Error checking late status:', error);
    return { isLate: false, lateMinutes: 0, shiftStartTime: null, shiftEndTime: null, workShiftId: null, shiftDuration: 0 };
  }
}

// Helper: Calculate distance between two coordinates using Haversine formula (in meters)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper: Validate geo-fencing
async function validateGeoFencing(employeeId: string, userLat: number, userLng: number) {
  try {
    // Get employee's company
    const employee = await User.findById(employeeId);
    if (!employee || !employee.companyId) {
      return { allowed: true, message: 'No company found, skipping geo-fence', code: 'NO_COMPANY' };
    }

    console.log('[Attendance API] Validating exemption for:', employee.name, {
      isGeoFencingExempt: employee.isGeoFencingExempt,
      geoFencingExemptUntil: employee.geoFencingExemptUntil,
      currentTime: new Date().toISOString()
    });

    // Check individual employee exemption
    if (employee.isGeoFencingExempt && employee.geoFencingExemptUntil) {
      const now = new Date();
      if (now <= employee.geoFencingExemptUntil) {
        return { 
          allowed: true, 
          message: 'Individual geo-fencing exemption active for today.', 
          code: 'EXEMPT' 
        };
      }
    }

    const company = await Company.findById(employee.companyId);
    if (!company) {
      return { allowed: true, message: 'Company not found, skipping geo-fence', code: 'COMPANY_NOT_FOUND' };
    }

    // Check if geo-fencing is enabled
    if (!company.enableGeoFencing) {
      return { allowed: true, message: 'Geo-fencing disabled', code: 'DISABLED' };
    }

    // Check if office location is set
    if (!company.officeLocation?.latitude || !company.officeLocation?.longitude) {
      return { 
        allowed: false, 
        message: 'Office location coordinates are not configured in company settings. Please contact your Admin.',
        code: 'CONFIG_ERROR' 
      };
    }

    const officeLat = company.officeLocation.latitude;
    const officeLng = company.officeLocation.longitude;
    const radius = company.geoFenceRadius || 100; // Default 100 meters

    const distance = calculateDistance(userLat, userLng, officeLat, officeLng);

    if (distance <= radius) {
      return { 
        allowed: true, 
        distance: Math.round(distance),
        message: `Within office radius (${Math.round(distance)}m)`,
        code: 'SUCCESS'
      };
    } else {
      return { 
        allowed: false, 
        distance: Math.round(distance),
        radius,
        message: `You are ${Math.round(distance)}m away from the office. Allowed radius is ${radius}m.`,
        code: 'OUT_OF_RANGE'
      };
    }
  } catch (error) {
    console.error('Geo-fencing validation error:', error);
    return { allowed: true, message: 'Internal error validating location', code: 'ERROR' };
  }
}

// Helper: Calculate overtime
// Logic: Overtime starts only after (shift end + late minutes) is completed
function calculateOvertime(checkOutTime: string, shiftEndTime: string, lateMinutes: number) {
  const checkOutMinutes = timeToMinutes(checkOutTime);
  const shiftEndMinutes = timeToMinutes(shiftEndTime);
  
  // Overtime threshold = shift end time + late minutes (employee must compensate for being late)
  const overtimeThreshold = shiftEndMinutes + lateMinutes;
  
  if (checkOutMinutes > overtimeThreshold) {
    const overtimeMinutes = checkOutMinutes - shiftEndMinutes;
    const overtimeHours = Math.round((overtimeMinutes / 60) * 10) / 10;
    return {
      isOvertime: true,
      overtimeMinutes,
      overtimeHours,
    };
  }
  
  return {
    isOvertime: false,
    overtimeMinutes: 0,
    overtimeHours: 0,
  };
}

// POST log attendance (Check-in / Check-out)
export async function POST(req: Request) {
  try {
    await connectDB();
    const { employeeId, date, checkIn, checkOut, companyId, note, location, workMode } = await req.json();

    // Get socket.io instance from global
    const io = (global as any).io;

    if (!employeeId || !date) {
      return NextResponse.json({ message: 'Missing employeeId or date' }, { status: 400 });
    }

    // Parse date string to Date object
    const attendanceDate = new Date(date);
    
    // Format time strings
    const formatTime = (timeStr?: string) => {
      if (!timeStr) return undefined;
      if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let h = hours;
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const formattedCheckIn = checkIn ? formatTime(checkIn) : undefined;
    const formattedCheckOut = checkOut ? formatTime(checkOut) : undefined;

    // Check for existing attendance first
    let attendance = await Attendance.findOne({ employeeId, date: attendanceDate });

    // Debug logging
    console.log('[Attendance] Check-in request:', { 
      employeeId, 
      hasLocation: !!(location?.lat && location?.lng),
      lat: location?.lat, 
      lng: location?.lng,
      hasCheckIn: !!formattedCheckIn,
      existingAttendance: !!attendance
    });

    // Validate geo-fencing on check-in (Skip if Work From Home)
    if (formattedCheckIn && (!attendance || !attendance.checkIn?.time) && workMode !== 'wfh') {
      if (location?.lat && location?.lng) {
        console.log('[Attendance] Validating geo-fencing...');
        const geoCheck = await validateGeoFencing(employeeId, location.lat, location.lng);
        console.log('[Attendance] Geo-fencing result:', geoCheck);
        if (!geoCheck.allowed) {
          return NextResponse.json({ 
            message: geoCheck.message,
            error: geoCheck.code === 'CONFIG_ERROR' ? 'CONFIG_ERROR' : 'OUTSIDE_GEO_FENCE',
            distance: geoCheck.distance,
            radius: geoCheck.radius
          }, { status: geoCheck.code === 'CONFIG_ERROR' ? 400 : 403 });
        }
      } else {
        // Strict Check: If geo-fencing is enabled for the company, deny check-in without coordinates
        const employee = await User.findById(employeeId);
        if (employee?.companyId) {
          const company = await Company.findById(employee.companyId);
          if (company?.enableGeoFencing) {
            return NextResponse.json({ 
              message: 'Office attendance requires location permissions. Please allow location access in your browser or switch to "Work From Home" mode.',
              error: 'LOCATION_REQUIRED'
            }, { status: 400 });
          }
        }
        console.log('[Attendance] No location provided, skipping geo-fencing check');
      }
    } else {
      console.log('[Attendance] Skipping geo-fencing - not a new check-in');
    }

    // Calculate late status if checking in
    let lateStatus = { isLate: false, lateMinutes: 0, shiftStartTime: null, shiftEndTime: null, workShiftId: null, shiftDuration: 0 };
    if (formattedCheckIn && (!attendance || !attendance.checkIn?.time)) {
      lateStatus = await checkLateStatus(employeeId, formattedCheckIn);
    }

    // Calculate total hours if checking out
    let totalHours = 0;
    if (formattedCheckOut && formattedCheckIn) {
      const checkInMinutes = timeToMinutes(formattedCheckIn);
      const checkOutMinutes = timeToMinutes(formattedCheckOut);
      totalHours = Math.round((checkOutMinutes - checkInMinutes) / 60 * 10) / 10;
    } else if (attendance?.checkIn?.time && formattedCheckOut) {
      const checkInMinutes = timeToMinutes(attendance.checkIn.time);
      const checkOutMinutes = timeToMinutes(formattedCheckOut);
      totalHours = Math.round((checkOutMinutes - checkInMinutes) / 60 * 10) / 10;
    }

    // Calculate overtime on checkout (only after late period is compensated)
    let overtime = { isOvertime: false, overtimeMinutes: 0, overtimeHours: 0 };
    if (formattedCheckOut) {
      const effectiveLateMinutes = attendance?.lateMinutes || lateStatus.lateMinutes || 0;
      const effectiveShiftEnd = attendance?.shiftEndTime || lateStatus.shiftEndTime;
      if (effectiveShiftEnd) {
        overtime = calculateOvertime(formattedCheckOut, effectiveShiftEnd, effectiveLateMinutes);
      }
    }

    // Determine status
    let status = 'Present';
    if (lateStatus.isLate) status = 'Late';
    else if (formattedCheckIn) status = 'On Time';

    if (attendance) {
      // Update existing
      if (formattedCheckIn) {
        // Find if there's an open session (one without checkOut)
        const lastSession = attendance.sessions && attendance.sessions.length > 0 
          ? attendance.sessions[attendance.sessions.length - 1] 
          : null;

        if (lastSession && !lastSession.checkOut) {
          // Update current open session check-in if needed (or just skip)
          lastSession.checkIn = formattedCheckIn;
          lastSession.workMode = workMode || attendance.workMode;
          lastSession.location = location?.lat && location?.lng ? { lat: location.lat, lng: location.lng } : undefined;
        } else {
          // Start a NEW session
          if (!attendance.sessions) attendance.sessions = [];
          attendance.sessions.push({
            checkIn: formattedCheckIn,
            workMode: workMode || attendance.workMode,
            location: location?.lat && location?.lng ? { lat: location.lat, lng: location.lng } : undefined
          });

          // Clear root checkOut since we are starting a new session
          attendance.checkOut = undefined;
        }

        // Always update the root checkIn for the first punch of the day
        if (!attendance.checkIn?.time) {
          attendance.checkIn = { 
            time: formattedCheckIn,
            location: location?.lat && location?.lng ? { lat: location.lat, lng: location.lng } : undefined
          };
          attendance.isLate = lateStatus.isLate;
          attendance.lateMinutes = lateStatus.lateMinutes;
          attendance.shiftStartTime = lateStatus.shiftStartTime;
          attendance.shiftEndTime = lateStatus.shiftEndTime;
          attendance.workShiftId = lateStatus.workShiftId;
          attendance.status = status;
        }
        
        if (workMode) attendance.workMode = workMode;
      }

      if (formattedCheckOut) {
        // Find the last session to close it
        if (attendance.sessions && attendance.sessions.length > 0) {
          const lastSession = attendance.sessions[attendance.sessions.length - 1];
          lastSession.checkOut = formattedCheckOut;
          
          // Calculate session duration in minutes
          if (lastSession.checkIn) {
            const start = timeToMinutes(lastSession.checkIn);
            const end = timeToMinutes(formattedCheckOut);
            lastSession.duration = end - start;
          }
        }

        // Update the root checkOut to the LATEST punch
        attendance.checkOut = { 
          time: formattedCheckOut,
          location: location?.lat && location?.lng ? { lat: location.lat, lng: location.lng } : undefined
        };

        // Recalculate total hours from ALL sessions
        let totalMinutes = 0;
        if (attendance.sessions) {
          attendance.sessions.forEach((s: any) => {
            if (s.checkIn && s.checkOut) {
              totalMinutes += (timeToMinutes(s.checkOut) - timeToMinutes(s.checkIn));
            }
          });
        }
        attendance.totalHours = Math.round((totalMinutes / 60) * 10) / 10;

        attendance.isOvertime = overtime.isOvertime;
        attendance.overtimeMinutes = overtime.overtimeMinutes;
        attendance.overtimeHours = overtime.overtimeHours;
      }
      if (note) attendance.note = note;
      await attendance.save();

      // Emit socket event for real-time sync
      if (io) {
        io.to(employeeId).emit('attendance-updated', {
          employeeId,
          date: attendanceDate.toISOString().split('T')[0],
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          status: attendance.status,
          workMode: attendance.workMode,
        });
        console.log('[Attendance] Socket event emitted: attendance-updated for user', employeeId);
      }
      
      return NextResponse.json({ 
        message: 'Attendance updated', 
        id: attendance._id,
        isLate: attendance.isLate,
        lateMinutes: attendance.lateMinutes,
        status: attendance.status,
        isOvertime: attendance.isOvertime,
        overtimeHours: attendance.overtimeHours,
      });
    } else {
      // Create new
      if (!companyId) {
        return NextResponse.json({ message: 'Missing companyId' }, { status: 400 });
      }
      
      const newAttendance = await Attendance.create({
        employeeId,
        companyId,
        date: attendanceDate,
        status,
        isLate: lateStatus.isLate,
        lateMinutes: lateStatus.lateMinutes,
        shiftStartTime: lateStatus.shiftStartTime,
        shiftEndTime: lateStatus.shiftEndTime,
        workShiftId: lateStatus.workShiftId,
        workMode: workMode || 'office',
        checkIn: formattedCheckIn ? { 
          time: formattedCheckIn,
          location: location?.lat && location?.lng ? { lat: location.lat, lng: location.lng } : undefined
        } : undefined,
        checkOut: formattedCheckOut ? { 
          time: formattedCheckOut,
          location: location?.lat && location?.lng ? { lat: location.lat, lng: location.lng } : undefined
        } : undefined,
        sessions: formattedCheckIn ? [{
          checkIn: formattedCheckIn,
          workMode: workMode || 'office',
          location: location?.lat && location?.lng ? { lat: location.lat, lng: location.lng } : undefined
        }] : [],
        totalHours,
        isOvertime: overtime.isOvertime,
        overtimeMinutes: overtime.overtimeMinutes,
        overtimeHours: overtime.overtimeHours,
        note,
      });

      // Emit socket event for real-time sync
      if (io) {
        io.to(employeeId).emit('attendance-updated', {
          employeeId,
          date: attendanceDate.toISOString().split('T')[0],
          checkIn: newAttendance.checkIn,
          checkOut: newAttendance.checkOut,
          status: newAttendance.status,
          workMode: newAttendance.workMode,
        });
        console.log('[Attendance] Socket event emitted: attendance-updated for user', employeeId);
      }
      
      return NextResponse.json({ 
        message: 'Attendance logged', 
        id: newAttendance._id,
        isLate: newAttendance.isLate,
        lateMinutes: newAttendance.lateMinutes,
        status: newAttendance.status,
        isOvertime: newAttendance.isOvertime,
        overtimeHours: newAttendance.overtimeHours,
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Attendance error:', error);
    return NextResponse.json({ message: 'Error logging attendance', error: error.message }, { status: 500 });
  }
}

// PUT update specific attendance record (Admin/HR only)
export async function PUT(req: Request) {
  try {
    await connectDB();
    const { id, checkIn, checkOut, date, workMode, status: manualStatus, note } = await req.json();

    if (!id) {
      return NextResponse.json({ message: 'Missing attendance record ID' }, { status: 400 });
    }

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return NextResponse.json({ message: 'Attendance record not found' }, { status: 404 });
    }

    // Update fields
    if (date) attendance.date = new Date(date);
    if (workMode) attendance.workMode = workMode;
    if (note !== undefined) attendance.note = note;

    const formatTime = (timeStr?: string) => {
      if (!timeStr) return undefined;
      if (timeStr.match(/^\d{2}:\d{2}$/)) return timeStr;
      return timeStr; // Assuming it's already HH:mm or handled by model
    };

    const formattedCheckIn = formatTime(checkIn);
    const formattedCheckOut = formatTime(checkOut);

    if (formattedCheckIn) {
      if (!attendance.checkIn) attendance.checkIn = {};
      attendance.checkIn.time = formattedCheckIn;
      
      // Recalculate late status
      const lateStatus = await checkLateStatus(attendance.employeeId, formattedCheckIn);
      attendance.isLate = lateStatus.isLate;
      attendance.lateMinutes = lateStatus.lateMinutes;
      attendance.shiftStartTime = lateStatus.shiftStartTime;
      attendance.shiftEndTime = lateStatus.shiftEndTime;
      attendance.status = manualStatus || (lateStatus.isLate ? 'Late' : 'On Time');
    }

    if (formattedCheckOut) {
      if (!attendance.checkOut) attendance.checkOut = {};
      attendance.checkOut.time = formattedCheckOut;
      
      // Recalculate total hours and overtime
      if (attendance.checkIn?.time) {
        const checkInMinutes = timeToMinutes(attendance.checkIn.time);
        const checkOutMinutes = timeToMinutes(formattedCheckOut);
        attendance.totalHours = Math.round((checkOutMinutes - checkInMinutes) / 60 * 10) / 10;
        
        if (attendance.shiftEndTime) {
          const overtime = calculateOvertime(formattedCheckOut, attendance.shiftEndTime, attendance.lateMinutes || 0);
          attendance.isOvertime = overtime.isOvertime;
          attendance.overtimeMinutes = overtime.overtimeMinutes;
          attendance.overtimeHours = overtime.overtimeHours;
        }
      }
    } else if (formattedCheckOut === null) {
      // Allow clearing checkout
      attendance.checkOut = undefined;
      attendance.totalHours = 0;
      attendance.isOvertime = false;
      attendance.overtimeMinutes = 0;
      attendance.overtimeHours = 0;
    }

    if (manualStatus) attendance.status = manualStatus;

    await attendance.save();
    return NextResponse.json({ message: 'Attendance record updated successfully', id: attendance._id });
  } catch (error: any) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({ message: 'Error updating attendance', error: error.message }, { status: 500 });
  }
}

// DELETE attendance record
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Missing record ID' }, { status: 400 });
    }

    await Attendance.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Attendance record deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting attendance', error: error.message }, { status: 500 });
  }
}
