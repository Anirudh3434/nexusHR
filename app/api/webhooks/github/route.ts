import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Project from '@/models/Project';
import Task from '@/models/Task';
import ActivityLog from '@/models/ActivityLog';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { escapeRegExp } from '@/lib/mongo';

/**
 * Extracts task numbers from any branch, commit message, or PR text.
 * Matches: TSK26070010, TASK-123, TSK-456, #TSK...
 */
function extractTaskNumbers(text: string): string[] {
  if (!text) return [];
  const results = new Set<string>();

  // 1. Standard NexusHR format: TSK followed by digits (e.g. TSK26070010)
  const tskMatches = text.match(/TSK\d+/gi);
  if (tskMatches) {
    tskMatches.forEach((m) => results.add(m.toUpperCase()));
  }

  // 2. Hyphenated formats: TSK-123, TASK-456
  const hyphenMatches = text.match(/(TSK|TASK)-\d+/gi);
  if (hyphenMatches) {
    hyphenMatches.forEach((m) => {
      // Standardize to uppercase without hyphen if needed or keep matching
      results.add(m.toUpperCase());
      results.add(m.replace('-', '').toUpperCase());
    });
  }

  return Array.from(results);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const rawBody = await req.text();
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    // Verify HMAC-SHA256 signature when secret is configured
    if (webhookSecret) {
      const signature = req.headers.get('x-hub-signature-256') || '';
      const expected =
        'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ message: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    const event = req.headers.get('x-github-event') || 'push';
    const repoFullName = body.repository?.full_name || '';

    // Handle initial GitHub ping verification event
    if (event === 'ping') {
      return NextResponse.json({
        message: 'GitHub webhook ping received successfully!',
        zen: body.zen,
        hookId: body.hook_id,
        repository: repoFullName,
      }, { status: 200 });
    }

    if (!repoFullName) {
      return NextResponse.json({ message: 'Missing repository identifier in payload' }, { status: 400 });
    }

    // Match repository to project using raw MongoDB driver to bypass Mongoose schema caching
    const rawDb = mongoose.connection.db;
    if (!rawDb) {
      return NextResponse.json({ message: 'Database connection not ready' }, { status: 500 });
    }

    const projectDoc = await rawDb.collection('projects').findOne({
      githubRepo: { $regex: new RegExp(`^${escapeRegExp(repoFullName, 128)}$`, 'i') }
    });

    if (!projectDoc) {
      return NextResponse.json({ 
        message: `No PMS Project linked to repository: "${repoFullName}"`,
        receivedRepo: repoFullName
      }, { status: 404 });
    }

    const senderLogin = body.sender?.login || 'GitHub';
    let updatedTasks: string[] = [];

    // Helper: update task status and attach activity / comment
    const applyTaskTransition = async (
      taskNumber: string,
      targetStatus: 'in_progress' | 'completed',
      sourceDescription: string,
      commentText: string
    ) => {
      const task = await Task.findOne({
        projectId: projectDoc._id,
        taskNumber: { $regex: new RegExp(`^${escapeRegExp(taskNumber)}$`, 'i') }
      });

      if (!task) return false;

      let changed = false;
      if (task.status !== targetStatus) {
        task.status = targetStatus;
        changed = true;
      }

      // Add comment to task
      if (!task.comments) task.comments = [];
      task.comments.push({
        userId: projectDoc.managerId || projectDoc.createdBy,
        userName: 'GitHub Integration',
        text: commentText,
        createdAt: new Date(),
      });

      await task.save();

      // Log in ActivityLog
      await ActivityLog.create({
        projectId: projectDoc._id,
        companyId: projectDoc.companyId,
        userId: task.createdBy || projectDoc.createdBy,
        userName: `GitHub (@${senderLogin})`,
        taskId: task._id,
        actionType: changed ? 'status_changed' : 'commented',
        fieldName: changed ? 'status' : undefined,
        newValue: changed ? targetStatus : undefined,
        description: sourceDescription,
      });

      updatedTasks.push(task.taskNumber);
      return true;
    };

    // ==========================================================
    // 1. EVENT: Branch Creation
    // ==========================================================
    if (event === 'create' && body.ref_type === 'branch') {
      const branchName = body.ref || '';
      const matchedNumbers = extractTaskNumbers(branchName);

      for (const tNum of matchedNumbers) {
        await applyTaskTransition(
          tNum,
          'in_progress',
          `Auto-progressed via GitHub branch creation: "${branchName}"`,
          `Branch "${branchName}" created by @${senderLogin} on GitHub.`
        );
      }

      return NextResponse.json({
        message: 'Processed branch creation event',
        branch: branchName,
        tasksUpdated: updatedTasks,
      });
    }

    // ==========================================================
    // 2. EVENT: Push (Commits)
    // ==========================================================
    if (event === 'push') {
      const ref = body.ref || '';
      const branchName = ref.replace('refs/heads/', '');
      const branchNumbers = extractTaskNumbers(branchName);

      // Transition branch tasks to in_progress
      for (const tNum of branchNumbers) {
        await applyTaskTransition(
          tNum,
          'in_progress',
          `Moved to in_progress via push to branch "${branchName}"`,
          `Code pushed to branch "${branchName}" by @${senderLogin}.`
        );
      }

      // Inspect commits
      const commits = Array.isArray(body.commits) ? body.commits : [];
      for (const commit of commits) {
        const msg = commit.message || '';
        const commitNumbers = extractTaskNumbers(msg);
        const isClosingCommit = /(fix(es)?|close[sd]?|resolve[sd]?|done)\s+([A-Z0-9#\-_ ]+)/i.test(msg);
        const shortHash = commit.id ? commit.id.substring(0, 7) : 'commit';

        for (const tNum of commitNumbers) {
          const target = isClosingCommit ? 'completed' : 'in_progress';
          await applyTaskTransition(
            tNum,
            target,
            `GitHub commit [${shortHash}]: "${msg.slice(0, 80)}"`,
            `Commit [${shortHash}] by @${commit.author?.username || commit.author?.name || senderLogin}: "${msg}"`
          );
        }
      }

      return NextResponse.json({
        message: 'Processed push event',
        branch: branchName,
        commitsCount: commits.length,
        tasksUpdated: updatedTasks,
      });
    }

    // ==========================================================
    // 3. EVENT: Pull Request
    // ==========================================================
    if (event === 'pull_request') {
      const pr = body.pull_request;
      const action = body.action;
      const prTitle = pr?.title || '';
      const prBranch = pr?.head?.ref || '';
      const prNumber = pr?.number || '';
      const isMerged = pr?.merged === true;

      const combinedText = `${prTitle} ${prBranch} ${pr?.body || ''}`;
      const prNumbers = extractTaskNumbers(combinedText);

      if (action === 'opened' || action === 'reopened') {
        for (const tNum of prNumbers) {
          await applyTaskTransition(
            tNum,
            'in_progress',
            `GitHub PR #${prNumber} opened: "${prTitle}"`,
            `Pull Request #${prNumber} "${prTitle}" opened by @${senderLogin} on GitHub.`
          );
        }
      } else if (action === 'closed' && isMerged) {
        for (const tNum of prNumbers) {
          await applyTaskTransition(
            tNum,
            'completed',
            `Auto-completed via merged GitHub PR #${prNumber}`,
            `Pull Request #${prNumber} "${prTitle}" merged into ${pr?.base?.ref || 'main'} by @${senderLogin}.`
          );
        }
      }

      return NextResponse.json({
        message: 'Processed pull request event',
        action,
        prNumber,
        isMerged,
        tasksUpdated: updatedTasks,
      });
    }

    return NextResponse.json({
      message: `Event "${event}" received. No actionable task transitions for payload.`,
      repository: repoFullName,
    }, { status: 200 });

  } catch (error: any) {
    console.error('GitHub Webhook processing error:', error);
    return NextResponse.json({ 
      message: 'Internal error processing webhook', 
      error: error.message 
    }, { status: 500 });
  }
}
