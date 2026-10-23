import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import JobPosition from '@/models/JobPosition';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const WRITE_ROLES = ['super_admin', 'admin', 'hr'];

function hasMaliciousKeys(obj: Record<string, any>): boolean {
  return Object.keys(obj).some((k) => k.startsWith('$') || k.includes('.'));
}

// GET job positions (public - for careers page; scoped when a session exists)
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    const status = searchParams.get('status') || 'Active';
    const isPublic = searchParams.get('public') === 'true';

    if (auth && auth.role !== 'super_admin' && queryCompanyId && auth.companyId && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const query: any = {};

    if (queryCompanyId) {
      query.companyId = queryCompanyId;
    } else if (auth && auth.role !== 'super_admin' && auth.companyId) {
      query.companyId = auth.companyId;
    }

    // For public careers page, only show active positions
    if (isPublic) {
      query.status = 'Active';
      query.$or = [
        { closesAt: { $exists: false } },
        { closesAt: { $gte: new Date() } }
      ];
    } else if (status) {
      query.status = status;
    }

    const positions = await JobPosition.find(query)
      .sort({ postedAt: -1 })
      .lean();

    return NextResponse.json(positions);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching positions', error: error.message }, { status: 500 });
  }
}

// POST create new job position (HR/Admin only)
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const isSuperAdmin = auth.role === 'super_admin';
    const data = await req.json();
    if (hasMaliciousKeys(data)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });

    if (data.companyId && !isSuperAdmin && data.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = isSuperAdmin ? (data.companyId || auth.companyId) : auth.companyId;
    if (!companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    const { title, department, designation, location, description, requirements, responsibilities, experienceRequired, salaryRange, employmentType, openings, status, closesAt } = data;
    if (!title || !department || !designation || !description) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Generate jobId manually if not provided
    let jobId = data.jobId;
    if (!jobId) {
      try {
        const count = await JobPosition.countDocuments();
        jobId = `JB${String(count + 1).padStart(4, '0')}`;
      } catch (countError) {
        console.error('Error counting documents:', countError);
        // Fallback: use timestamp
        jobId = `JB${Date.now().toString().slice(-4)}`;
      }
    }

    const position = await JobPosition.create({
      companyId, jobId, title, department, designation, location, description,
      requirements, responsibilities, experienceRequired, salaryRange,
      employmentType, openings, status, closesAt,
    });
    return NextResponse.json(position, { status: 201 });
  } catch (error: any) {
    console.error('POST job position error:', error);
    return NextResponse.json({ message: 'Error creating position', error: error.message }, { status: 500 });
  }
}

// PUT update job position
export async function PUT(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    const data = await req.json();
    if (hasMaliciousKeys(data)) return NextResponse.json({ message: 'Invalid keys' }, { status: 400 });
    if (data.companyId && auth.role !== 'super_admin' && data.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const existing = await JobPosition.findById(id);
    if (!existing) return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const updateData: any = {};
    for (const f of ['title', 'department', 'designation', 'location', 'description', 'requirements', 'responsibilities', 'experienceRequired', 'salaryRange', 'employmentType', 'openings', 'status', 'closesAt'] as const) {
      if (data[f] !== undefined) updateData[f] = data[f];
    }
    const position = await JobPosition.findByIdAndUpdate(id, updateData, { new: true });

    if (!position) {
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }

    return NextResponse.json(position);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating position', error: error.message }, { status: 500 });
  }
}

// DELETE job position
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    const existing = await JobPosition.findById(id);
    if (!existing) return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const position = await JobPosition.findByIdAndDelete(id);

    if (!position) {
      return NextResponse.json({ message: 'Position not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Position deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error deleting position', error: error.message }, { status: 500 });
  }
}
