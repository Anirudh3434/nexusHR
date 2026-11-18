import './_load-env';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Company from '../models/Company';
import Attendance from '../models/Attendance';
import WorkShift from '../models/WorkShift';

async function main() {
  await connectDB();

  const user = await User.findOne({ name: { $regex: 'Girish Chandran', $options: 'i' } });
  if (!user) {
    console.error('Error: Girish Chandran not found!');
    process.exit(1);
  }

  const company = await Company.findById(user.companyId);
  console.log(`Seeding attendance for: ${user.name} (${user.email})`);
  console.log(`Company: ${company?.name || user.companyId}`);

  const workShift = await WorkShift.findById(user.workShiftId);
  const shiftStartTime = workShift?.startTime || '10:00';
  const shiftEndTime = workShift?.endTime || '19:00';

  // Clear existing attendance for Girish Chandran from 2026-10-01 to 2026-11-30 to avoid duplicates
  const startDate = new Date(Date.UTC(2026, 9, 1)); // Oct 1, 2026
  const endDate = new Date(Date.UTC(2026, 10, 30, 23, 59, 59)); // Nov 30, 2026

  const deleted = await Attendance.deleteMany({
    employeeId: user._id,
    date: { $gte: startDate, $lte: endDate }
  });
  console.log(`Cleared ${deleted.deletedCount} existing records for range Oct 1 - Nov 30, 2026.`);

  const recordsToInsert = [];

  // Helper to format date string "YYYY-MM-DD"
  const formatDateKey = (d: Date) => d.toISOString().split('T')[0];

  // Specific attendance definitions for November 2026 (up to today, Nov 17, 2026)
  const novemberSpecialDays: Record<number, { status: string; checkIn: string; checkOut: string; workMode: string; isLate?: boolean; lateMinutes?: number; isOvertime?: boolean; overtimeHours?: number; note?: string }> = {
    2:  { status: 'Present', checkIn: '09:51', checkOut: '19:12', workMode: 'office' },
    3:  { status: 'Present', checkIn: '09:56', checkOut: '19:05', workMode: 'office' },
    4:  { status: 'Present', checkIn: '09:48', checkOut: '19:45', workMode: 'wfh', isOvertime: true, overtimeHours: 0.75, note: 'Sprint bug triage' },
    5:  { status: 'Late',    checkIn: '10:38', checkOut: '19:40', workMode: 'office', isLate: true, lateMinutes: 38, note: 'Metro delay' },
    6:  { status: 'Present', checkIn: '09:54', checkOut: '19:10', workMode: 'office' },
    9:  { status: 'Present', checkIn: '09:52', checkOut: '19:15', workMode: 'wfh' },
    10: { status: 'Present', checkIn: '09:49', checkOut: '19:08', workMode: 'office' },
    11: { status: 'Half Day',checkIn: '10:00', checkOut: '14:15', workMode: 'office', note: 'Personal appointment in afternoon' },
    12: { status: 'Present', checkIn: '09:55', checkOut: '19:20', workMode: 'wfh' },
    13: { status: 'Late',    checkIn: '10:25', checkOut: '19:35', workMode: 'office', isLate: true, lateMinutes: 25 },
    16: { status: 'Present', checkIn: '09:50', checkOut: '19:18', workMode: 'office' },
    17: { status: 'Present', checkIn: '09:52', checkOut: '19:05', workMode: 'wfh', note: 'Current active workday' },
  };

  // Generate October 2026 (1 to 31)
  for (let day = 1; day <= 31; day++) {
    const targetDate = new Date(Date.UTC(2026, 9, day, 0, 0, 0));
    const dayOfWeek = targetDate.getUTCDay(); // 0 = Sun, 6 = Sat

    // Skip weekends (Saturday and Sunday)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Default weekday values
    let status = 'Present';
    let isLate = false;
    let lateMinutes = 0;
    let checkIn = '09:52';
    let checkOut = '19:08';
    let isOvertime = false;
    let overtimeHours = 0;
    const workMode = day % 3 === 0 ? 'wfh' : 'office';

    if (day === 8 || day === 21) {
      // Late days
      status = 'Late';
      isLate = true;
      lateMinutes = day === 8 ? 28 : 18;
      checkIn = day === 8 ? '10:28' : '10:18';
      checkOut = '19:25';
    } else if (day === 14) {
      // Half day
      status = 'Half Day';
      checkIn = '09:58';
      checkOut = '14:05';
    } else if (day === 16 || day === 27) {
      // Overtime days
      isOvertime = true;
      overtimeHours = 1;
      checkIn = '09:47';
      checkOut = '20:05';
    } else {
      // Normal present
      const inMin = 48 + (day % 11);
      const outMin = 5 + (day % 18);
      checkIn = inMin < 60 ? `09:${String(inMin).padStart(2, '0')}` : '10:00';
      checkOut = `19:${String(outMin).padStart(2, '0')}`;
    }

    // Calculate total hours
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const totalHours = Math.round(((outH * 60 + outM - (inH * 60 + inM)) / 60) * 10) / 10;

    recordsToInsert.push({
      employeeId: user._id,
      companyId: user.companyId,
      date: targetDate,
      checkIn: {
        time: checkIn,
        ip: '103.21.124.89',
        location: { lat: 28.4595, lng: 77.0266 },
      },
      checkOut: {
        time: checkOut,
        ip: '103.21.124.89',
        location: { lat: 28.4595, lng: 77.0266 },
      },
      totalHours,
      status,
      isLate,
      lateMinutes,
      isOvertime,
      overtimeHours,
      workMode,
      shiftStartTime,
      shiftEndTime,
      workShiftId: user.workShiftId,
    });
  }

  // Generate November 2026 (1 to 17)
  for (let day = 1; day <= 17; day++) {
    const targetDate = new Date(Date.UTC(2026, 10, day, 0, 0, 0));
    const dayOfWeek = targetDate.getUTCDay();

    // Skip weekends (Saturday and Sunday)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const custom = novemberSpecialDays[day];
    const status = custom?.status || 'Present';
    const checkIn = custom?.checkIn || '09:52';
    const checkOut = custom?.checkOut || '19:10';
    const isLate = custom?.isLate || false;
    const lateMinutes = custom?.lateMinutes || 0;
    const isOvertime = custom?.isOvertime || false;
    const overtimeHours = custom?.overtimeHours || 0;
    const workMode = custom?.workMode || 'office';
    const note = custom?.note;

    // Calculate total hours
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const totalHours = Math.round(((outH * 60 + outM - (inH * 60 + inM)) / 60) * 10) / 10;

    recordsToInsert.push({
      employeeId: user._id,
      companyId: user.companyId,
      date: targetDate,
      checkIn: {
        time: checkIn,
        ip: workMode === 'wfh' ? '122.161.45.12' : '103.21.124.89',
        location: { lat: 28.4595, lng: 77.0266 },
      },
      checkOut: {
        time: checkOut,
        ip: workMode === 'wfh' ? '122.161.45.12' : '103.21.124.89',
        location: { lat: 28.4595, lng: 77.0266 },
      },
      totalHours,
      status,
      isLate,
      lateMinutes,
      isOvertime,
      overtimeHours,
      workMode,
      note,
      shiftStartTime,
      shiftEndTime,
      workShiftId: user.workShiftId,
    });
  }

  console.log(`Inserting ${recordsToInsert.length} attendance records for Girish Chandran...`);
  await Attendance.insertMany(recordsToInsert);

  console.log('Successfully seeded attendance records:');
  const novCount = recordsToInsert.filter(r => new Date(r.date).getUTCMonth() === 10).length;
  const octCount = recordsToInsert.filter(r => new Date(r.date).getUTCMonth() === 9).length;
  console.log(`- October 2026: ${octCount} records`);
  console.log(`- November 2026: ${novCount} records (Nov 1 to Nov 17)`);

  process.exit(0);
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
