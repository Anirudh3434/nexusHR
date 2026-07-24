import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

// POST - Add a comment to a task
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name') || 'Unknown';
    
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { taskId, text, attachments } = body;

    if (!taskId || !text) {
      return NextResponse.json({ 
        message: 'Task ID and comment text are required' 
      }, { status: 400 });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    // Add comment
    const comment = {
      userId: new mongoose.Types.ObjectId(userId),
      userName,
      text,
      attachments: attachments || [],
      createdAt: new Date(),
    };

    if (!task.comments) {
      task.comments = [];
    }

    task.comments.push(comment);
    await task.save();

    return NextResponse.json({ 
      message: 'Comment added successfully',
      comments: task.comments 
    });
  } catch (error: any) {
    console.error('Error adding task comment:', error);
    return NextResponse.json({ message: 'Error adding comment', error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a comment from a task
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
    const taskId = searchParams.get('taskId');
    const commentId = searchParams.get('commentId');

    if (!taskId || !commentId) {
      return NextResponse.json({ 
        message: 'Task ID and Comment ID are required' 
      }, { status: 400 });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    // Find comment
    const commentIndex = task.comments?.findIndex(c => (c as any)._id.toString() === commentId);
    if (commentIndex === undefined || commentIndex === -1) {
      return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    }

    const comment = task.comments![commentIndex];

    // Verify ownership: only creator of comment or admin/HR/manager can delete
    const isAuthor = comment.userId.toString() === userId;
    const isStaff = ['admin', 'hr', 'manager'].includes(userRole);

    if (!isAuthor && !isStaff) {
      return NextResponse.json({ message: 'Forbidden: You cannot delete this comment' }, { status: 403 });
    }

    // Remove comment
    task.comments!.splice(commentIndex, 1);
    await task.save();

    return NextResponse.json({ 
      message: 'Comment deleted successfully',
      comments: task.comments 
    });
  } catch (error: any) {
    console.error('Error deleting task comment:', error);
    return NextResponse.json({ message: 'Error deleting comment', error: error.message }, { status: 500 });
  }
}
