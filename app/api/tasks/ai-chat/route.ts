import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task, { TaskStatus } from '@/models/Task';
import Project from '@/models/Project';
import ActivityLog from '@/models/ActivityLog';
import User from '@/models/User';
import mongoose from 'mongoose';
import { headers } from 'next/headers';

// Helper to generate task numbers for created tasks
async function generateTaskNumber(): Promise<string> {
  const date = new Date();
  const prefix = 'TSK';
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const monthPrefix = `${prefix}${year}${month}`;
  const lastTask = await Task.findOne({
    taskNumber: { $regex: `^${monthPrefix}` }
  }).sort({ taskNumber: -1 });

  let sequence = 1;
  if (lastTask && lastTask.taskNumber) {
    const lastSequence = parseInt(lastTask.taskNumber.slice(-4));
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }
  return `${prefix}${year}${month}${sequence.toString().padStart(4, '0')}`;
}

// Normalize status strings from LLM output
function normalizeStatus(status?: string): TaskStatus {
  if (!status) return 'to_do';
  const s = status.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (s === 'in_progress' || s === 'inprogress' || s === 'progress' || s === 'doing') return 'in_progress';
  if (s === 'completed' || s === 'complete' || s === 'done' || s === 'closed') return 'completed';
  if (s === 'in_review' || s === 'inreview' || s === 'review' || s === 'qa') return 'in_review';
  if (s === 'backlog') return 'backlog';
  if (s === 'to_do' || s === 'todo' || s === 'open' || s === 'pending') return 'to_do';
  return 'to_do';
}

// Helper to resolve task by either 24-char ObjectId or taskNumber (e.g. TSK26070010)
async function findTaskByIdOrNumber(idOrNumber: string, projectId?: string) {
  if (!idOrNumber) return null;
  const clean = idOrNumber.trim();
  if (mongoose.Types.ObjectId.isValid(clean)) {
    const found = await Task.findById(clean);
    if (found) return found;
  }
  return await Task.findOne({
    taskNumber: { $regex: new RegExp(`^${clean}$`, 'i') },
    ...(projectId && mongoose.Types.ObjectId.isValid(projectId) ? { projectId } : {})
  });
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const body = await req.json().catch(() => ({}));

    // Robust extraction of user identity from headers or body
    let userId = headersList.get('x-user-id') || body.userId || body.user?.id || body.user?._id;
    let userName = headersList.get('x-user-name') || body.userName || body.user?.name;
    let companyId = headersList.get('x-company-id') || body.companyId || body.user?.companyId;

    const prompt = body.prompt || body.message || '';
    let projectId = body.projectId;
    const history = body.history || body.conversationHistory || body.messages || [];
    const modelChoice = body.model;

    if (!prompt) {
      return NextResponse.json({ message: 'Prompt or message is required' }, { status: 400 });
    }

    // Resolve user details if needed
    if (userId && mongoose.Types.ObjectId.isValid(userId) && (!userName || !companyId)) {
      const userDoc = await User.findById(userId).select('name companyId').lean();
      if (userDoc) {
        if (!userName) userName = userDoc.name;
        if (!companyId) companyId = userDoc.companyId?.toString();
      }
    }

    if (!userName) userName = 'Team Member';

    // 1. Resolve active project context
    let project: any = null;
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      project = await Project.findById(projectId)
        .populate('managerId', 'name email')
        .populate('members.employeeId', 'name email');
    }

    // If project not specified or not found, pick the most recent project for company
    if (!project && companyId) {
      project = await Project.findOne({ companyId, isArchived: { $ne: true } })
        .sort({ updatedAt: -1 })
        .populate('managerId', 'name email')
        .populate('members.employeeId', 'name email');
      if (project) {
        projectId = project._id.toString();
      }
    }

    const effectiveCompanyId = companyId || project?.companyId?.toString();

    // 2. Fetch company members & relevant tasks
    const companyMembers = effectiveCompanyId
      ? await User.find({ companyId: effectiveCompanyId }).select('name email department').lean()
      : [];

    let projectTasks: any[] = [];
    const taskNumberMatches = prompt.match(/TSK\d+/gi);
    if (taskNumberMatches && taskNumberMatches.length > 0) {
      projectTasks = await Task.find({
        taskNumber: { $in: taskNumberMatches.map((t: string) => t.toUpperCase()) }
      }).lean();
    } else if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      projectTasks = await Task.find({ projectId })
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean();
    } else if (effectiveCompanyId) {
      projectTasks = await Task.find({ companyId: effectiveCompanyId })
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean();
    }

    const membersContext = companyMembers.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email
    }));

    const tasksContext = projectTasks.map((t: any) => ({
      id: t._id.toString(),
      taskNumber: t.taskNumber,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignees: t.assignedTo ? t.assignedTo.map((id: any) => id.toString()) : []
    }));

    const currentDate = new Date().toISOString();

    // 3. Build system prompt
    const systemPrompt = `You are NexusAI, an elite, agentic project management AI assistant integrated directly into the workspace.
Your purpose is to answer questions with precision and execute workspace operations requested by the user.

Available Operations:
1. "move_task": Change task status.
   Format: { "type": "move_task", "taskId": "TSK... or ObjectId", "status": "backlog" | "to_do" | "in_progress" | "in_review" | "completed" }
2. "assign_task": Assign a task to a user.
   Format: { "type": "assign_task", "taskId": "TSK... or ObjectId", "assigneeId": "user-id" }
3. "add_comment": Add a comment to a task.
   Format: { "type": "add_comment", "taskId": "TSK... or ObjectId", "text": "comment message" }
4. "set_priority": Update task priority.
   Format: { "type": "set_priority", "taskId": "TSK... or ObjectId", "priority": "low" | "medium" | "high" | "critical" }
5. "create_task": Create a new task.
   Format: { "type": "create_task", "title": "Task title", "priority": "medium", "taskType": "task" | "bug" | "story" }

Workspace Context:
- Project ID: "${projectId || 'Workspace'}"
- Current User ID ("me" / "my"): "${userId || 'current-user'}"
- Current User Name: "${userName}"
- Current Date/Time: "${currentDate}"
- Workspace Members: ${JSON.stringify(membersContext)}
- Project Tasks: ${JSON.stringify(tasksContext)}

Instructions:
- When a user asks a question, answer clearly in markdown with clean tables, bullet points, and highlighted status badges.
- When an operation is requested (e.g. "move TSK26070010 to in progress", "assign TSK26070012 to Tarun", "comment on TSK26070011 saying done"), identify the matching task numbers/IDs and specify the actions in the "actions" array.
- For status inputs: map "in progress" -> "in_progress", "todo" -> "to_do", "review" -> "in_review", "done" -> "completed", "backlog" -> "backlog".
- If no action is needed, leave the "actions" array empty: [].

You MUST respond strictly with a valid JSON object matching this structure:
{
  "response": "Your clean markdown answer to the user.",
  "actions": [
    { "type": "move_task", "taskId": "...", "status": "in_progress" }
  ]
}
Output raw JSON only.`;

    // 4. Format message history for LLM
    const formattedHistory = history.map((h: any) => ({
      role: (h.role === 'user' || h.sender === 'user') ? 'user' : 'assistant',
      content: h.content || h.text || ''
    })).filter((h: any) => Boolean(h.content));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...formattedHistory,
      { role: 'user', content: prompt }
    ];

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'NVIDIA API key not configured' }, { status: 500 });
    }

    // 5. Call NVIDIA NIM with fast 8B model (or 70B if pro requested, with automatic fallback)
    const preferredModel = (modelChoice === 'nexus-pro') ? 'meta/llama-3.1-70b-instruct' : 'meta/llama-3.1-8b-instruct';
    
    let reply = '';
    const callNvidia = async (modelName: string, timeoutMs: number = 8000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages,
            temperature: 0.2,
            max_tokens: 2048
          })
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`NVIDIA HTTP ${res.status}: ${errText}`);
        }
        const data = await res.json();
        return data.choices[0]?.message?.content?.trim() || '';
      } catch (err: any) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      reply = await callNvidia(preferredModel, 9000);
    } catch (primaryErr) {
      console.warn(`Primary model ${preferredModel} failed or timed out, trying meta/llama-3.1-8b-instruct:`, primaryErr);
      if (preferredModel !== 'meta/llama-3.1-8b-instruct') {
        try {
          reply = await callNvidia('meta/llama-3.1-8b-instruct', 9000);
        } catch (fallbackErr: any) {
          console.error('Fallback model also failed:', fallbackErr);
          return NextResponse.json({
            message: 'AI Service currently experiencing high latency. Please retry in a moment.',
            error: fallbackErr.message
          }, { status: 502 });
        }
      } else {
        return NextResponse.json({
          message: 'Failed to contact AI service.',
          error: (primaryErr as any).message
        }, { status: 502 });
      }
    }

    if (!reply) {
      return NextResponse.json({ message: 'AI returned an empty response' }, { status: 502 });
    }

    // 6. Safe JSON parsing with fallback
    let aiText = reply;
    let actions: any[] = [];
    try {
      let jsonText = reply;
      const codeBlockMatch = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      } else {
        const firstBrace = reply.indexOf('{');
        const lastBrace = reply.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonText = reply.substring(firstBrace, lastBrace + 1);
        }
      }
      const parsed = JSON.parse(jsonText.trim());
      aiText = parsed.response || parsed.message || reply;
      actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    } catch (e) {
      aiText = reply.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      actions = [];
    }

    // 7. Execute agentic actions in database
    let actionsExecutedCount = 0;
    const executedActionTypes: string[] = [];

    if (actions && Array.isArray(actions)) {
      for (const action of actions) {
        try {
          if (action.type === 'move_task' && action.taskId) {
            const task = await findTaskByIdOrNumber(action.taskId, projectId);
            if (task) {
              const newStatus = normalizeStatus(action.status);
              task.status = newStatus;
              await task.save();
              actionsExecutedCount++;
              executedActionTypes.push('Status Updated');

              if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                await ActivityLog.create({
                  projectId: task.projectId || projectId,
                  companyId: effectiveCompanyId,
                  userId: new mongoose.Types.ObjectId(userId),
                  userName,
                  taskId: task._id,
                  actionType: 'status_changed',
                  fieldName: 'status',
                  newValue: newStatus,
                  description: `NexusAI moved task ${task.taskNumber || ''} to ${newStatus}`
                }).catch(() => {});
              }
            }
          } else if (action.type === 'assign_task' && action.taskId) {
            const task = await findTaskByIdOrNumber(action.taskId, projectId);
            if (task) {
              let targetUserId = action.assigneeId;
              if (targetUserId && !mongoose.Types.ObjectId.isValid(targetUserId)) {
                const matchedMember = companyMembers.find(m =>
                  m.name.toLowerCase().includes(targetUserId.toLowerCase()) ||
                  targetUserId.toLowerCase().includes(m.name.toLowerCase())
                );
                if (matchedMember) targetUserId = matchedMember._id.toString();
              }

              if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
                task.assignedTo = [new mongoose.Types.ObjectId(targetUserId)];
                await task.save();
                actionsExecutedCount++;
                executedActionTypes.push('Assignee Updated');

                if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                  await ActivityLog.create({
                    projectId: task.projectId || projectId,
                    companyId: effectiveCompanyId,
                    userId: new mongoose.Types.ObjectId(userId),
                    userName,
                    taskId: task._id,
                    actionType: 'assignee_changed',
                    fieldName: 'assignedTo',
                    newValue: [targetUserId],
                    description: `NexusAI assigned task ${task.taskNumber || ''} to user`
                  }).catch(() => {});
                }
              }
            }
          } else if (action.type === 'add_comment' && action.taskId && action.text) {
            const task = await findTaskByIdOrNumber(action.taskId, projectId);
            if (task) {
              const commenterId = (userId && mongoose.Types.ObjectId.isValid(userId))
                ? new mongoose.Types.ObjectId(userId)
                : (companyMembers.length > 0 ? companyMembers[0]._id : new mongoose.Types.ObjectId());
              task.comments = task.comments || [];
              task.comments.push({
                userId: commenterId,
                userName,
                text: action.text,
                createdAt: new Date(),
                attachments: []
              });
              await task.save();
              actionsExecutedCount++;
              executedActionTypes.push('Comment Added');

              if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                await ActivityLog.create({
                  projectId: task.projectId || projectId,
                  companyId: effectiveCompanyId,
                  userId: new mongoose.Types.ObjectId(userId),
                  userName,
                  taskId: task._id,
                  actionType: 'comment_added',
                  fieldName: 'comments',
                  description: `NexusAI added comment to ${task.taskNumber || ''}: "${action.text}"`
                }).catch(() => {});
              }
            }
          } else if (action.type === 'set_priority' && action.taskId && action.priority) {
            const task = await findTaskByIdOrNumber(action.taskId, projectId);
            if (task) {
              task.priority = action.priority.toLowerCase() as any;
              await task.save();
              actionsExecutedCount++;
              executedActionTypes.push('Priority Changed');
            }
          } else if (action.type === 'create_task' && action.title && (projectId || project?._id)) {
            const assignedProjId = projectId || project?._id;
            if (assignedProjId && mongoose.Types.ObjectId.isValid(assignedProjId)) {
              const newTaskNumber = await generateTaskNumber();
              const creatorId = (userId && mongoose.Types.ObjectId.isValid(userId))
                ? new mongoose.Types.ObjectId(userId)
                : (companyMembers.length > 0 ? companyMembers[0]._id : new mongoose.Types.ObjectId());
              const compId = effectiveCompanyId && mongoose.Types.ObjectId.isValid(effectiveCompanyId)
                ? new mongoose.Types.ObjectId(effectiveCompanyId)
                : (project?.companyId || new mongoose.Types.ObjectId());
              
              await Task.create({
                taskNumber: newTaskNumber,
                title: action.title,
                description: action.description || '',
                status: normalizeStatus(action.status || 'to_do'),
                priority: (action.priority || 'medium').toLowerCase(),
                taskType: action.taskType || 'task',
                projectId: new mongoose.Types.ObjectId(assignedProjId),
                companyId: compId,
                createdBy: creatorId,
                assignedBy: creatorId,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                progressPercentage: 0,
                assignedTo: action.assignedTo && mongoose.Types.ObjectId.isValid(action.assignedTo) ? [new mongoose.Types.ObjectId(action.assignedTo)] : []
              });
              actionsExecutedCount++;
              executedActionTypes.push(`Task Created (${newTaskNumber})`);
            }
          }
        } catch (actionErr) {
          console.error('Error executing agent action:', action, actionErr);
        }
      }
    }

    // 8. Return refreshed task list & AI response
    let updatedTasks: any[] = [];
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      updatedTasks = await Task.find({ projectId })
        .populate('projectId', 'name projectNumber')
        .populate('assignedTo', 'name email department')
        .populate('assignedBy', 'name email')
        .populate('dependsOn', 'taskNumber title status')
        .populate('blocks', 'taskNumber title status')
        .populate('parentId', 'taskNumber title status')
        .populate('createdBy', 'name email')
        .lean();
    }

    return NextResponse.json({
      response: aiText,
      message: aiText,
      tasks: updatedTasks,
      actionsExecuted: actionsExecutedCount,
      actionExecuted: actionsExecutedCount > 0,
      actionType: executedActionTypes.join(', ') || undefined
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in Nexus AI Chat route:', error);
    return NextResponse.json({ message: 'Error in Nexus AI Chat', error: error.message }, { status: 500 });
  }
}
