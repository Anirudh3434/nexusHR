import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import PerformanceAnalysis from '@/models/PerformanceAnalysis';
import { analyzePerformance } from '../nvidia-ai';

export const runDailyAnalysis = async (date: Date = new Date()) => {
  try {
    await connectDB();
    
    // Set range for the day (UTC)
    const startDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
    const endDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

    console.log(`[Analysis Engine] Running analysis for ${date.toISOString().split('T')[0]}`);

    // Fetch all active employees
    const employees = await User.find({ isActive: true });
    
    const results = [];

    for (const emp of employees) {
      // Find today's attendance
      const attendance = await Attendance.findOne({
        employeeId: emp._id,
        date: { $gte: startDate, $lte: endDate }
      });

      if (!attendance) {
        // If no attendance, skip AI but could mark as absent (optional)
        continue;
      }

      // Aggregate metrics
      const input = {
        employeeName: emp.name,
        designation: emp.designation || 'Staff',
        lateMinutes: attendance.lateMinutes || 0,
        workingHours: attendance.totalHours || 0,
        overtimeHours: (attendance.overtimeHours || 0) + (attendance.manualOvertimeHours || 0),
        status: attendance.status || 'Present'
      };

      // Call NVIDIA AI
      const aiResult = await analyzePerformance(input);

      // Store in DB
      const analysis = await PerformanceAnalysis.findOneAndUpdate(
        { employeeId: emp._id, date: startDate },
        {
          companyId: emp.companyId,
          rating: aiResult.rating,
          summary: aiResult.summary,
          merits: aiResult.merits,
          demerits: aiResult.demerits,
          suggestions: aiResult.suggestions,
          metrics: {
            lateMinutes: input.lateMinutes,
            totalHours: input.workingHours,
            overtimeHours: input.overtimeHours,
            onTimeCheckIn: !attendance.isLate
          }
        },
        { upsert: true, new: true }
      );

      results.push(analysis._id);
    }

    console.log(`[Analysis Engine] Completed. Analyzed ${results.length} employees.`);
    return results;

  } catch (error: any) {
    console.error('[Analysis Engine] Error:', error.message);
    throw error;
  }
};
