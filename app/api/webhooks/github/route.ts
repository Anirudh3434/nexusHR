import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import Task from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const event = req.headers.get('x-github-event') || 'push';
    const body = await req.json();

    const repoFullName = body.repository?.full_name || '';
    if (!repoFullName) {
      return NextResponse.json({ message: 'Missing repository identifier' }, { status: 400 });
    }

    // Match repository to project using raw MongoDB driver to bypass Mongoose schema caching in dev environments
    const rawDb = mongoose.connection.db;
    if (!rawDb) {
      return NextResponse.json({ message: 'Database connection not ready' }, { status: 500 });
    }

    const projectDoc = await rawDb.collection('projects').findOne({
      githubRepo: { $regex: new RegExp(`^${repoFullName}$`, 'i') }
    });

    if (!projectDoc) {
      const allProjects = await rawDb.collection('projects').find({}).toArray();
      return NextResponse.json({ 
        message: `No PMS Project linked to repository: "${repoFullName}"`,
        availableProjectsInDB: allProjects.map(p => ({ id: p._id.toString(), name: p.name, githubRepo: p.githubRepo }))
      }, { status: 404 });
    }

    // Extract branch name based on event type
    let branchName = '';
    if (event === 'create' && body.ref_type === 'branch') {
      branchName = body.ref || '';
    } else if (event === 'push') {
      const ref = body.ref || '';
      branchName = ref.replace('refs/heads/', '');
    }

    if (!branchName) {
      return NextResponse.json({ message: 'No branch identifier found in payload' }, { status: 200 });
    }

    // Find task number matches in branch name (e.g. feature/TSK26070010-auth -> TSK26070010)
    const taskNumberMatches = branchName.match(/TSK\d+/gi);
    if (!taskNumberMatches || taskNumberMatches.length === 0) {
      return NextResponse.json({ message: `No task number patterns found in branch name: "${branchName}"` }, { status: 200 });
    }

    let updatedCount = 0;
    for (const match of taskNumberMatches) {
      const taskNumberUpper = match.toUpperCase();
      const task = await Task.findOne({
        projectId: projectDoc._id,
        taskNumber: taskNumberUpper
      });

      if (task && task.status !== 'in_progress') {
        task.status = 'in_progress';
        await task.save();

        // Create status change activity log
        await ActivityLog.create({
          projectId: projectDoc._id,
          companyId: projectDoc.companyId,
          userId: task.createdBy || projectDoc.createdBy,
          userName: 'GitHub Integration',
          taskId: task._id,
          actionType: 'status_changed',
          fieldName: 'status',
          newValue: 'in_progress',
          description: `Auto-shifted status to In Progress via GitHub branch creation: "${branchName}"`
        });
        updatedCount++;
      }
    }

    return NextResponse.json({ 
      message: 'GitHub webhook processed successfully', 
      branch: branchName,
      matchesFound: taskNumberMatches,
      tasksUpdated: updatedCount
    }, { status: 200 });

  } catch (error: any) {
    console.error('GitHub Webhook processing error:', error);
    return NextResponse.json({ message: 'Internal error processing webhook', error: error.message }, { status: 500 });
  }
}
