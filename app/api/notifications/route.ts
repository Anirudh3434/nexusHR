import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { getAuthInfo } from '@/lib/auth-util';

/** Cards addressed to the signed-in user, newest first. */
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50);
    const pending = searchParams.get('pending') === 'true';
    const unreadOnly = searchParams.get('unread') === 'true';

    const query: Record<string, any> = { recipientId: auth.userId };
    if (auth.companyId) query.companyId = auth.companyId;
    if (pending) query.celebrationSeenAt = null;
    if (unreadOnly) query.readAt = null;

    const [notifications, unread] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ recipientId: auth.userId, readAt: null }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((item: any) => ({
        id: String(item._id),
        kind: item.kind,
        title: item.title,
        message: item.message,
        href: item.href,
        meta: item.meta || null,
        actorName: item.actorName || null,
        createdAt: item.createdAt,
        readAt: item.readAt || null,
      })),
      unread,
    });
  } catch (error: any) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { message: 'Error fetching notifications', error: error.message },
      { status: 500 }
    );
  }
}

/** Marks cards as announced at login (`seen`) or read (bell-style). */
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
    const action = body?.action === 'read' ? 'read' : 'seen';

    const query: Record<string, any> = { recipientId: auth.userId };
    if (auth.companyId) query.companyId = auth.companyId;
    if (ids.length > 0) query._id = { $in: ids };

    const update =
      action === 'read'
        ? { $set: { readAt: new Date(), celebrationSeenAt: new Date() } }
        : { $set: { celebrationSeenAt: new Date() } };

    const result = await Notification.updateMany(query, update);

    return NextResponse.json({ updated: result.modifiedCount ?? 0 });
  } catch (error: any) {
    console.error('Notifications update error:', error);
    return NextResponse.json(
      { message: 'Error updating notifications', error: error.message },
      { status: 500 }
    );
  }
}
