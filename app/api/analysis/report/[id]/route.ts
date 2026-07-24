import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PerformanceAnalysis from '@/models/PerformanceAnalysis';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const report = await PerformanceAnalysis.findById(id)
      .populate('employeeId', 'name designation department email');

    if (!report) {
      return NextResponse.json({ message: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching report', error: error.message }, { status: 500 });
  }
}
