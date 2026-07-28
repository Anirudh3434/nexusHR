import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ReportExecution from '@/models/ReportExecution';
import { headers } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');

    if (!companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const execution = await ReportExecution.findOne({ _id: id, companyId })
      .populate('templateId', 'name description')
      .populate('executedBy', 'name email');

    if (!execution) {
      return NextResponse.json({ message: 'Execution not found' }, { status: 404 });
    }

    return NextResponse.json({ execution }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching report execution:', error);
    return NextResponse.json({ message: 'Error fetching execution', error: error.message }, { status: 500 });
  }
}
