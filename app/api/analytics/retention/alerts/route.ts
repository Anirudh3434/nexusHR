import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RetentionAlert from '@/models/RetentionAlert';
import { headers } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    let companyId = headersList.get('x-company-id');
    let userRole = headersList.get('x-user-role');

    // Fallback: Check cookies or query params
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
        userRole = userRole || 'admin';
      } else {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(req.url);
    const acknowledged = searchParams.get('acknowledged');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    const query: any = { companyId };
    
    if (acknowledged !== null) {
      query.acknowledged = acknowledged === 'true';
    }
    
    if (severity) {
      query.severity = severity;
    }

    // Only admins and HR can see all alerts
    if (userRole !== 'admin' && userRole !== 'hr') {
      // Regular employees can only see their own alerts (if needed in future)
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const alerts = await RetentionAlert.find(query)
      .populate('employeeId', 'name designation department')
      .populate('acknowledgedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ alerts }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching retention alerts:', error);
    return NextResponse.json({ message: 'Error fetching retention alerts', error: error.message }, { status: 500 });
  }
}
