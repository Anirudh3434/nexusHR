import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PerformanceAnalysis from '@/models/PerformanceAnalysis';

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const days = parseInt(searchParams.get('days') || '14');

    if (!employeeId) {
      return NextResponse.json({ message: 'Missing employeeId' }, { status: 400 });
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
