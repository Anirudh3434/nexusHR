import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Holiday from '@/models/Holiday';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const WRITE_ROLES = ['super_admin', 'admin', 'hr'];

// GET holidays (public; scoped when a session exists)
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    if (auth && auth.role !== 'super_admin' && queryCompanyId && auth.companyId && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = queryCompanyId || (auth && auth.role !== 'super_admin' ? auth.companyId : undefined);

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31`);

    const holidays = await Holiday.find({
      companyId,
      isActive: true,
      date: {
        $gte: startOfYear,
        $lte: endOfYear,
      },
    })
      .populate('createdBy', 'name')
      .sort({ date: 1 });

    const formattedHolidays = holidays.map(holiday => ({
      ...holiday.toObject(),
      id: holiday._id.toString(),
      _id: undefined,
      createdBy: holiday.createdBy ? {
        id: holiday.createdBy._id.toString(),
        name: holiday.createdBy.name,
      } : null,
    }));

    return NextResponse.json(formattedHolidays);
  } catch (error: any) {
    console.error('Holidays fetch error:', error);
    return NextResponse.json({ message: 'Error fetching holidays', error: error.message }, { status: 500 });
  }
}

// POST create holiday (admin/HR only)
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const isSuperAdmin = auth.role === 'super_admin';
    const data = await req.json();

    if (data.companyId && !isSuperAdmin && data.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    const companyId = isSuperAdmin ? (data.companyId || auth.companyId) : auth.companyId;
    const { name, date, type, description, isRecurring } = data;
    const createdBy = auth.userId;

    if (!companyId || !name || !date || !createdBy) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const newHoliday = await Holiday.create({
      companyId,
      name,
      date: new Date(date),
      type: type || 'Company',
      description,
      isRecurring: isRecurring || false,
      createdBy,
      isActive: true,
    });

    return NextResponse.json({
      message: 'Holiday created successfully',
      id: newHoliday._id,
      holiday: newHoliday,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Holiday create error:', error);
    return NextResponse.json({ message: 'Error creating holiday', error: error.message }, { status: 500 });
  }
}

// DELETE holiday (admin/HR only)
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Holiday ID required' }, { status: 400 });
    }

    const existing = await Holiday.findById(id);
    if (!existing) return NextResponse.json({ message: 'Holiday not found' }, { status: 404 });
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const holiday = await Holiday.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!holiday) {
      return NextResponse.json({ message: 'Holiday not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Holiday deleted successfully' });
  } catch (error: any) {
    console.error('Holiday delete error:', error);
    return NextResponse.json({ message: 'Error deleting holiday', error: error.message }, { status: 500 });
  }
}
