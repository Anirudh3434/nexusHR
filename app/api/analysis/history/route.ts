import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PerformanceAnalysis from '@/models/PerformanceAnalysis';
import User from '@/models/User';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const days = parseInt(searchParams.get('days') || '14');

    if (!employeeId) {
      return NextResponse.json({ message: 'Missing employeeId' }, { status: 400 });
    }

    // Employees may only view their own history; staff stay within their company.
    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr', 'manager']) && employeeId !== auth.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (hasRole(auth.role, ['admin', 'hr', 'manager'])) {
      const target = await User.findById(employeeId).select('companyId').lean();
      if (!target || target.companyId?.toString() !== auth.companyId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch history for the specific employee
    const history = await PerformanceAnalysis.find({
      employeeId,
      date: { $gte: startDate }
    })
    .sort({ date: 1 })
    .select('date rating metrics');

    // Format for charts
    const chartData = history.map(item => ({
      date: new Date(item.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      rating: item.rating,
      workHours: item.metrics?.totalHours || 0,
      lateMinutes: item.metrics?.lateMinutes || 0,
    }));

    return NextResponse.json(chartData);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching history', error: error.message }, { status: 500 });
  }
}
