import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

// POST - Add comment to ticket
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const userName = headersList.get('x-user-name') || 'Unknown';
    
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

    // Find ticket
    const ticket = await Ticket.findById(ticketId);
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

    return NextResponse.json({ 
      message: 'Comment added successfully',
      comment 
    });
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ message: 'Error adding comment', error: error.message }, { status: 500 });
  }
}
