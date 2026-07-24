import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import VersionSnapshot from '@/models/VersionSnapshot';
import Task from '@/models/Task';
import { headers } from 'next/headers';
import mongoose from 'mongoose';

// GET - Fetch version snapshots with filtering
export async function GET(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role') || 'employee';
    const companyId = headersList.get('x-company-id');
    
    if (!userId || !companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');
    const reason = searchParams.get('reason');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query
    const query: any = { 
      companyId,
      isDeleted: false 
    };
    
    if (taskId) query.taskId = taskId;
    if (projectId) query.projectId = projectId;
    if (reason) query.reason = reason;
    
    // Fetch version snapshots
    const snapshots = await VersionSnapshot.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();
    
    // Get total count
    const total = await VersionSnapshot.countDocuments(query);
    
    return NextResponse.json({ snapshots, total });
  } catch (error) {
    console.error('Error fetching version snapshots:', error);
    return NextResponse.json({ message: 'Failed to fetch version snapshots' }, { status: 500 });
  }
}

// POST - Create version snapshot
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name');
    const companyId = headersList.get('x-company-id');
    
    if (!userId || !companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { taskId, reason, description } = body;
    
    if (!taskId || !reason) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // Fetch current task state
    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }
    
    // Create snapshot with current task data
    const snapshot = await VersionSnapshot.create({
      taskId,
      projectId: task.projectId,
      companyId,
      userId,
      userName: userName || 'Unknown User',
      reason,
      description,
      taskData: task.toObject(),
    });
    
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error('Error creating version snapshot:', error);
    return NextResponse.json({ message: 'Failed to create version snapshot' }, { status: 500 });
  }
}

// DELETE - Soft delete version snapshot
export async function DELETE(req: Request) {
  try {
    await connectDB();
    
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');
    
    if (!userId || !companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const snapshotId = searchParams.get('id');
    
    if (!snapshotId) {
      return NextResponse.json({ message: 'Missing snapshot ID' }, { status: 400 });
    }
    
    const snapshot = await VersionSnapshot.findById(snapshotId);
    if (!snapshot) {
      return NextResponse.json({ message: 'Snapshot not found' }, { status: 404 });
    }
    
    // Check if user has permission (same company)
    if (snapshot.companyId.toString() !== companyId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    
    // Soft delete
    snapshot.isDeleted = true;
    snapshot.deletedAt = new Date();
    snapshot.deletedBy = new mongoose.Types.ObjectId(userId);
    await snapshot.save();
    
    return NextResponse.json({ message: 'Snapshot deleted' });
  } catch (error) {
    console.error('Error deleting version snapshot:', error);
    return NextResponse.json({ message: 'Failed to delete version snapshot' }, { status: 500 });
  }
}
