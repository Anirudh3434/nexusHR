import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Notice from '@/models/Notice';

// GET notices (all users can view)
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const category = searchParams.get('category');
    const limit = searchParams.get('limit') || '10';

    let query: any = { isActive: true };
    if (companyId) query.companyId = companyId;
    if (category) query.category = category;

    // Only show non-expired notices or notices without expiry
    query.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gte: new Date() } }
    ];

    const notices = await Notice.find(query)
      .populate('postedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const formattedNotices = notices.map(notice => ({
      ...notice.toObject(),
      id: notice._id.toString(),
      _id: undefined,
      postedBy: notice.postedBy ? {
        id: notice.postedBy._id.toString(),
        name: notice.postedBy.name,
        role: notice.postedBy.role,
      } : null,
    }));

    return NextResponse.json(formattedNotices);
  } catch (error: any) {
    console.error('Notices fetch error:', error);
    return NextResponse.json({ message: 'Error fetching notices', error: error.message }, { status: 500 });
  }
}

// POST create notice (admin/HR only)
export async function POST(req: Request) {
  try {
    await connectDB();
    const data = await req.json();

    const { companyId, title, content, category, priority, postedBy, expiryDate } = data;

    if (!companyId || !title || !content || !postedBy) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const newNotice = await Notice.create({
      companyId,
      title,
      content,
      category: category || 'General',
      priority: priority || 'Medium',
      postedBy,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      isActive: true,
    });

    return NextResponse.json({
      message: 'Notice created successfully',
      id: newNotice._id,
      notice: newNotice,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Notice create error:', error);
    return NextResponse.json({ message: 'Error creating notice', error: error.message }, { status: 500 });
  }
}

// DELETE notice (admin/HR only)
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Notice ID required' }, { status: 400 });
    }

    const notice = await Notice.findByIdAndUpdate(id, { isActive: false }, { new: true });

    if (!notice) {
      return NextResponse.json({ message: 'Notice not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Notice deleted successfully' });
  } catch (error: any) {
    console.error('Notice delete error:', error);
    return NextResponse.json({ message: 'Error deleting notice', error: error.message }, { status: 500 });
  }
}
