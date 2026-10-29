import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { headers } from 'next/headers';
import mongoose from 'mongoose';
import { notify } from '@/lib/notify';

// GET - Fetch comments for a ticket (internal comments stripped for non-staff)
export async function GET(req: Request) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ message: 'Ticket ID is required' }, { status: 400 });
    }

    const ticket = await Ticket.findOne({ _id: ticketId, ...(companyId ? { companyId } : {}) }).lean();
    if (!ticket) {
      return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
    }

    const isReporter = (ticket as any).reportedBy.toString() === userId;
    const isStaff = ['admin', 'hr', 'manager', 'super_admin'].includes(userRole);

    if (!isReporter && !isStaff) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const comments = Array.isArray((ticket as any).comments) ? (ticket as any).comments : [];
    const visible = isStaff ? comments : comments.filter((c: any) => !c.internal);

    return NextResponse.json({ comments: visible });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ message: 'Error fetching comments', error: error.message }, { status: 500 });
  }
}

// POST - Add comment to ticket
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const userName = headersList.get('x-user-name') || 'Unknown';
    const companyId = headersList.get('x-company-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ticketId, message, internal = false } = body;

    if (!ticketId || !message) {
      return NextResponse.json({
        message: 'Ticket ID and message are required'
      }, { status: 400 });
    }

    // Find ticket (scoped to the session company)
    const ticket = await Ticket.findOne({ _id: ticketId, ...(companyId ? { companyId } : {}) });
    if (!ticket) {
      return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions
    const isReporter = ticket.reportedBy.toString() === userId;
    const isAdmin = ['admin', 'hr', 'manager'].includes(userRole);
    
    if (!isReporter && !isAdmin) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    // Employees cannot add internal comments
    if (internal && !isAdmin) {
      return NextResponse.json({ message: 'Only staff can add internal comments' }, { status: 403 });
    }

    // Add comment
    const comment = {
      author: new mongoose.Types.ObjectId(userId),
      authorName: userName,
      message,
      createdAt: new Date(),
      internal: isAdmin ? internal : false,
    };

    ticket.comments.push(comment);
    await ticket.save();

    // Notify relevant party about the new reply
    if (!comment.internal && ticket.companyId) {
      if (isReporter) {
        // Reporter replied -> notify assignee or approvers
        await notify({
          companyId: String(ticket.companyId),
          kind: 'ticket',
          title: `Reply on ticket ${ticket.ticketNumber}`,
          message: message.slice(0, 120),
          href: '/tickets',
          meta: 'Customer Reply',
          recipientIds: ticket.assignedTo ? [String(ticket.assignedTo)] : undefined,
          roles: ticket.assignedTo ? undefined : ['admin', 'hr', 'manager'],
          actorId: userId,
          actorName: userName,
        });
      } else {
        // Staff replied -> notify reporter
        await notify({
          companyId: String(ticket.companyId),
          kind: 'ticket',
          title: `New reply on ticket ${ticket.ticketNumber}`,
          message: message.slice(0, 120),
          href: '/my-tickets',
          meta: 'Reply',
          recipientIds: [String(ticket.reportedBy)],
          actorId: userId,
          actorName: userName,
        });
      }
    }

    return NextResponse.json({ 
      message: 'Comment added successfully',
      comment 
    });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ message: 'Error adding comment', error: error.message }, { status: 500 });
  }
}
