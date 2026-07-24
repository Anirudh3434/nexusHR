import { NextResponse } from 'next/server';
import githubService from '@/services/githubService';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import Project from '@/models/Project';

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    // Verify webhook signature
    if (!signature || !githubService.verifyWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(payload);
    const eventType = req.headers.get('x-github-event');

    console.log('GitHub webhook event:', eventType, data);

    // Handle branch creation event
    if (eventType === 'create' && data.ref_type === 'branch') {
      await handleBranchCreated(data);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error: any) {
    console.error('Error processing GitHub webhook:', error);
    return NextResponse.json({ message: 'Error processing webhook', error: error.message }, { status: 500 });
  }
}

async function handleBranchCreated(data: any) {
  await connectDB();

  const branchName = data.ref;
  const repoFullName = data.repository.full_name;
  const senderLogin = data.sender.login;

  console.log(`Branch created: ${branchName} in ${repoFullName} by ${senderLogin}`);

  // Parse ticket number from branch name
  const ticketNumber = githubService.parseTicketNumberFromBranch(branchName);

  if (!ticketNumber) {
    console.log('No ticket number found in branch name:', branchName);
    return;
  }

  console.log('Found ticket number:', ticketNumber);

  // Find project by GitHub repo
  const project = await Project.findOne({ githubRepo: repoFullName });

  if (!project) {
    console.log('No project found for repo:', repoFullName);
    return;
  }

  console.log('Found project:', project.name);

  // Find task by ticket number in this project
  const task = await Task.findOne({
    taskNumber: ticketNumber.toUpperCase(),
    projectId: project._id,
  });

  if (!task) {
    console.log('No task found with ticket number:', ticketNumber);
    return;
  }

  console.log('Found task:', task.taskNumber, task.title);

  // Update task status to in_progress if it's not already
  if (task.status !== 'in_progress' && task.status !== 'completed' && task.status !== 'cancelled') {
    task.status = 'in_progress';
    
    // Add a comment about the status change
    const comment = {
      userId: project.managerId, // System comment from project manager
      userName: 'GitHub Integration',
      text: `Branch "${branchName}" created by ${senderLogin}. Task status automatically moved to in progress.`,
      createdAt: new Date(),
    };

    if (!task.comments) {
      task.comments = [];
    }
    task.comments.push(comment);

    await task.save();
    console.log('Task status updated to in_progress:', task.taskNumber);
  } else {
    console.log('Task already in progress or completed:', task.status);
  }
}
