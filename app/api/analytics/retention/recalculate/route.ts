import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { runCompanyRetentionPredictions } from '@/lib/retention/predictor';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    let companyId = headersList.get('x-company-id');
    let userRole = headersList.get('x-user-role');

    // Fallback to cookie
    if (!companyId) {
      const userCookie = req.cookies.get('user')?.value;
      if (userCookie) {
        try {
          const u = JSON.parse(userCookie);
          companyId = u.companyId;
          userRole = u.role;
        } catch {}
      }
    }

    if (!companyId) {
      const Company = (await import('@/models/Company')).default;
      const comp = await Company.findOne({ isActive: true });
      if (comp) {
        companyId = comp._id.toString();
        userRole = 'admin';
      } else {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json();
    const { employeeIds } = body;

    let result;
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      // Run for specific employees
      const { runEmployeeRetentionPrediction } = await import('@/lib/retention/predictor');
      let processed = 0;
      let errors = 0;

      for (const employeeId of employeeIds) {
        try {
          await runEmployeeRetentionPrediction(employeeId, companyId!);
          processed++;
        } catch (error) {
          console.error(`Error processing employee ${employeeId}:`, error);
          errors++;
        }
      }

      result = { processed, errors };
    } else {
      // Run for all employees in company
      result = await runCompanyRetentionPredictions(companyId!);
    }

    return NextResponse.json({
      message: 'Retention predictions recalculated successfully',
      ...result
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error recalculating retention predictions:', error);
    return NextResponse.json({ message: 'Error recalculating predictions', error: error.message }, { status: 500 });
  }
}
