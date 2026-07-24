import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import User from '@/models/User';

// GET: Fetch overtime records for a period
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const month = parseInt(searchParams.get('month') || '-1');
    const year = parseInt(searchParams.get('year') || '-1');
    const employeeId = searchParams.get('employeeId');

    if (!companyId) {
      return NextResponse.json({ message: 'Missing companyId' }, { status: 400 });
    }

    let query: any = { 
      companyId,
      $or: [
        { overtimeHours: { $gt: 0 } },
        { manualOvertimeHours: { $gt: 0 } }
      ]
    };

    if (month !== -1 && year !== -1) {
      const startDate = new Date(Date.UTC(year, month, 1));
      const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }

    const records = await Attendance.find(query)
      .populate('employeeId', 'name department designation email')
      .sort({ date: -1 });

    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching overtime records', error: error.message }, { status: 500 });
  }
}

// POST: Add or update manual overtime
export async function POST(req: Request) {
  try {
    await connectDB();
    const { employeeId, companyId, date, hours, note } = await req.json();

    if (!employeeId || !companyId || !date || hours === undefined) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const [y, m, d] = date.split('-').map(Number);
    const targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

    // Find existing attendance for that day or create a new one
    const record = await Attendance.findOneAndUpdate(
      { employeeId, companyId, date: targetDate },
      { 
        $set: { 
          manualOvertimeHours: Number(hours),
          manualOvertimeNote: note 
        } 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: 'Overtime recorded successfully', record });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error recording overtime', error: error.message }, { status: 500 });
  }
}

// PATCH: Update overtime status (e.g., exclude/reject)
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return NextResponse.json({ message: 'Record not found' }, { status: 404 });
    }

    const oldStatus = attendance.overtimeStatus || 'pending';
    const totalOT = (attendance.overtimeHours || 0) + (attendance.manualOvertimeHours || 0);

    // 1. Pending -> Comp-Off (Increment Balance)
    if (status === 'comp_off' && oldStatus === 'pending') {
      if (totalOT > 0) {
        await User.findByIdAndUpdate(attendance.employeeId, { $inc: { compOffBalance: totalOT } });
      }
    } 
    // 2. Comp-Off -> Pending (Deduct Balance - REVERSAL)
    else if (status === 'pending' && oldStatus === 'comp_off') {
      if (totalOT > 0) {
        await User.findByIdAndUpdate(attendance.employeeId, { $inc: { compOffBalance: -totalOT } });
      }
    }

    const updatedRecord = await Attendance.findByIdAndUpdate(
      id,
      { $set: { overtimeStatus: status } },
      { new: true }
    );

    return NextResponse.json({ message: `Status updated to ${status}`, record: updatedRecord });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating overtime status', error: error.message }, { status: 500 });
  }
}
