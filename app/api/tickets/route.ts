import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { headers } from 'next/headers';

// Generate ticket number helper
async function generateTicketNumber(): Promise<string> {
  const date = new Date();
  const prefix = 'TKT';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  const count = await Ticket.countDocuments({
    createdAt: {
      $gte: new Date(date.getFullYear(), date.getMonth(), 1),
    },
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `${prefix}${year}${month}${sequence}`;
}

// GET - Fetch tickets
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
    const urlCompanyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const reportedBy = searchParams.get('reportedBy');
    const myTickets = searchParams.get('myTickets');

    const query: any = {};

    // Role-based filtering
    if (userRole === 'employee') {
      query.reportedBy = userId;
    } else if (urlCompanyId || companyId) {
      query.companyId = urlCompanyId || companyId;
    }

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (reportedBy) query.reportedBy = reportedBy;
    if (myTickets === 'true') query.reportedBy = userId;

    const tickets = await Ticket.find(query)
      .populate('reportedBy', 'name email')
      .populate('employeeId', 'firstName lastName employeeId department')
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ message: 'Error fetching tickets', error: error.message }, { status: 500 });
  }
}

// POST - Create new ticket
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { title, description, category, priority, department, employeeId, attachments } = body;

    // Validation
    if (!title || !description || !category) {
      return NextResponse.json({ 
        message: 'Missing required fields',
        required: ['title', 'description', 'category']
      }, { status: 400 });
    }

    const ticketNumber = await generateTicketNumber();

    const ticket = await Ticket.create({
      ticketNumber,
      title,
      description,
      category,
      priority: priority || 'medium',
      status: 'open',
      reportedBy: userId,
      employeeId: employeeId || null,
      companyId: companyId || body.companyId,
      department: department || '',
      attachments: attachments || [],
      comments: [],
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('reportedBy', 'name email')
      .populate('employeeId', 'firstName lastName employeeId department');

    return NextResponse.json({ 
      message: 'Ticket created successfully',
      ticket: populatedTicket 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return NextResponse.json({ message: 'Error creating ticket', error: error.message }, { status: 500 });
  }
}

// PATCH - Update ticket
export async function PATCH(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { 
      id, 
      status, 
      priority, 
      assignedTo, 
      resolutionNotes, 
      dueDate,
      timeSpent,
      attachments 
    } = body;

    if (!id) {
      return NextResponse.json({ message: 'Ticket ID is required' }, { status: 400 });
    }

    // Find ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions
    const isReporter = ticket.reportedBy.toString() === userId;
    const canManage = ['admin', 'hr', 'manager'].includes(userRole);
    
    if (!isReporter && !canManage) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
    }

    const updateData: any = {};
    
    // Status updates
    if (status && (canManage || (isReporter && status === 'cancelled'))) {
      updateData.status = status;
      
      if (status === 'in_progress' && !ticket.assignedAt) {
        updateData.assignedTo = userId;
        updateData.assignedAt = new Date();
      }
      
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = userId;
        if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
      }
      
      if (status === 'closed') {
        updateData.closedAt = new Date();
        updateData.closedBy = userId;
      }
    }
    
    // Admin/HR only updates
    if (canManage) {
      if (priority) updateData.priority = priority;
      if (assignedTo) {
        updateData.assignedTo = assignedTo;
        updateData.assignedAt = new Date();
      }
      if (dueDate) updateData.dueDate = dueDate;
      if (timeSpent !== undefined) updateData.timeSpent = timeSpent;
      if (attachments) updateData.attachments = attachments;
      if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(id, updateData, { new: true })
      .populate('reportedBy', 'name email')
      .populate('employeeId', 'firstName lastName employeeId department')
      .populate('assignedTo', 'name email');

    return NextResponse.json({ 
      message: 'Ticket updated successfully',
      ticket: updatedTicket 
    });
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    return NextResponse.json({ message: 'Error updating ticket', error: error.message }, { status: 500 });
  }
}

// DELETE - Cancel/Delete ticket
export async function DELETE(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Ticket ID is required' }, { status: 400 });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
    }

    // Only reporter or admin can delete/cancel
    const isReporter = ticket.reportedBy.toString() === userId;
    const isAdmin = ['admin', 'hr'].includes(userRole);
    
    if (!isReporter && !isAdmin) {
      return NextResponse.json({ message: 'You can only cancel your own tickets' }, { status: 403 });
    }

    // Can only cancel if not already closed or resolved
    if (['closed', 'resolved'].includes(ticket.status)) {
      return NextResponse.json({ 
        message: `Cannot cancel ticket with status: ${ticket.status}` 
      }, { status: 400 });
    }

    // Soft delete by marking as cancelled
    ticket.status = 'cancelled';
    ticket.closedAt = new Date();
    ticket.closedBy = new mongoose.Types.ObjectId(userId);
    await ticket.save();

    return NextResponse.json({ message: 'Ticket cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling ticket:', error);
    return NextResponse.json({ message: 'Error cancelling ticket', error: error.message }, { status: 500 });
  }
}

import mongoose from 'mongoose';
