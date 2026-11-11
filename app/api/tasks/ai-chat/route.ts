import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task, { TaskStatus } from '@/models/Task';
import Project from '@/models/Project';
import ActivityLog from '@/models/ActivityLog';
import User from '@/models/User';
import mongoose from 'mongoose';
import { headers } from 'next/headers';
import { getAuthInfo } from '@/lib/auth-util';

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
// Always scoped to the session company.
async function findTaskByIdOrNumber(idOrNumber: string, projectId?: string, companyId?: string) {
  if (!idOrNumber) return null;
  const clean = idOrNumber.trim();
  const scope: any = companyId ? { companyId } : {};
  if (mongoose.Types.ObjectId.isValid(clean)) {
    const found = await Task.findOne({ _id: clean, ...scope });
    if (found) return found;
  }
  return await Task.findOne({
    taskNumber: { $regex: new RegExp(`^${clean}$`, 'i') },
    ...(projectId && mongoose.Types.ObjectId.isValid(projectId) ? { projectId } : {}),
    ...scope
  });
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    // Identity comes from the session ONLY — no body fallbacks.
    const userId = auth.userId;
    let userName = headersList.get('x-user-name') || undefined;
    const companyId = auth.companyId;

    const prompt = body.prompt || body.message || '';
    let projectId = body.projectId;
    const history = body.history || body.conversationHistory || body.messages || [];
    const modelChoice = body.model;
    const isVoiceRequest = body.isVoice || false;

    if (!prompt) {
      return NextResponse.json({ message: 'Prompt or message is required' }, { status: 400 });
    }

    // Resolve user details if needed (session user only)
    if (mongoose.Types.ObjectId.isValid(userId) && !userName) {
      const userDoc = await User.findById(userId).select('name companyId').lean();
      if (userDoc) {
        // Never adopt a companyId from anywhere but the session.
        if (userDoc.companyId?.toString() !== companyId) {
          return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
        }
        if (!userName) userName = userDoc.name;
      }
    }

    if (!userName) userName = 'Team Member';

    // 1. Resolve active project context (scoped to the session company)
    let project: any = null;
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      project = await Project.findOne({ _id: projectId, companyId })
        .populate('managerId', 'name email')
        .populate('members.employeeId', 'name email');
      if (!project) {
        return NextResponse.json({ message: 'Forbidden: project not found in your company' }, { status: 403 });
      }
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

    const effectiveCompanyId = companyId;

    // 2. Fetch company members & relevant tasks (all scoped to session company)
    const companyMembers = await User.find({ companyId: effectiveCompanyId }).select('name email department').lean();

    let projectTasks: any[] = [];
    const taskNumberMatches = prompt.match(/TSK\d+/gi);
    if (taskNumberMatches && taskNumberMatches.length > 0) {
      projectTasks = await Task.find({
        taskNumber: { $in: taskNumberMatches.map((t: string) => t.toUpperCase()) },
        companyId: effectiveCompanyId
      }).lean();
    } else if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      projectTasks = await Task.find({ projectId, companyId: effectiveCompanyId })
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean();
    } else {
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

    // 3. Build system prompt with Dual-Response Engine (Rich UI text + Natural Spoken Voice text)
    const systemPrompt = `You are NexusAI, an elite, agentic project management voice and workspace AI assistant.
You communicate clearly for both visual screen reading AND natural audio listening.

Dual-Response Rule:
There is a fundamental difference between READING information and LISTENING to spoken speech:
- For "response": Provide rich markdown formatting with bullet points, bold highlights, and task IDs for the visual UI.
- For "voiceResponse": Provide a warm, natural, human-friendly spoken response (1-2 clear sentences) crafted strictly for the ear. Never read out raw markdown, brackets, or long strings of task IDs. Summarize titles naturally (e.g. "You have 3 tasks assigned. The top priority is fixing the login issue. Would you like me to start on that?").

Available Agent Operations:
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
- Project Name: "${project?.name || 'Entire Workspace'}"
- Current User ID ("me" / "my"): "${userId || 'current-user'}"
- Current User Name: "${userName}"
- Current Date/Time: "${currentDate}"
- Workspace Members: ${JSON.stringify(membersContext)}
- Project Tasks: ${JSON.stringify(tasksContext)}

Instructions:
- If the user request is ambiguous, ask a clarifying question in both text and voice, and provide quick options in the "suggestions" array.
- When an operation is executed, confirm the action cleanly in both "response" and "voiceResponse".

You MUST respond strictly with a valid JSON object matching this structure:
{
  "response": "Your structured visual markdown answer for the screen.",
  "voiceResponse": "Your concise, warm, natural spoken sentence for audio playback.",
  "suggestions": ["Follow-up option 1", "Option 2"],
  "actions": []
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

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();

    const provider = groqKey
      ? {
          name: 'groq',
          url: 'https://api.groq.com/openai/v1/chat/completions',
          apiKey: groqKey,
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
        }
      : nvidiaKey
      ? {
          name: 'nvidia',
          url: 'https://integrate.api.nvidia.com/v1/chat/completions',
          apiKey: nvidiaKey,
          model: (modelChoice === 'nexus-pro') ? 'meta/llama-3.1-70b-instruct' : 'meta/llama-3.1-8b-instruct'
        }
      : null;

    let aiText = '';
    let voiceText = '';
    let suggestions: string[] = [];
    let actions: any[] = [];

    // Local deterministic fallback runner
    const runLocalFallback = () => {
      const cleanPrompt = prompt.trim().toLowerCase();

      if (/^(hey|hi|hello|hola|good\s+(morning|afternoon|evening)|sup|yo)\b/i.test(cleanPrompt)) {
        aiText = `Hi ${userName || 'there'}! 👋 I'm **NexusAI**, your agentic workspace assistant.\n\nI have full access to your project tasks. Here are some things you can ask me:\n- 📋 *"List in-progress tasks"*\n- 🐛 *"Show all bug tasks with high or critical priority"*\n- 🔄 *"Move TSK26070010 to in progress"*\n- 👤 *"Assign TSK26070012 to Tarun"*\n- 💬 *"Comment on TSK26070011 saying: looks good"*\n\nHow can I help you today?`;
        voiceText = `Hi ${userName || 'there'}! I'm NexusAI. How can I help you with your project tasks today?`;
        suggestions = ["List In Progress Tasks", "High Priority Bugs", "What tasks are assigned to me?"];
      } else if (/(?:move|set|change|update)\s+(?:task\s+)?(TSK[A-Za-z0-9_-]+|[a-f0-9]{24})\s+(?:status\s+)?(?:to\s+)?([a-z_\s-]+)/i.test(prompt)) {
        const match = prompt.match(/(?:move|set|change|update)\s+(?:task\s+)?(TSK[A-Za-z0-9_-]+|[a-f0-9]{24})\s+(?:status\s+)?(?:to\s+)?([a-z_\s-]+)/i);
        if (match) {
          const targetTaskId = match[1].trim();
          const targetStatus = normalizeStatus(match[2].trim());
          actions.push({ type: 'move_task', taskId: targetTaskId, status: targetStatus });
          aiText = `✅ Moving task **${targetTaskId}** to **${targetStatus.replace(/_/g, ' ')}**...`;
          voiceText = `Moving task ${targetTaskId} to ${targetStatus.replace(/_/g, ' ')}.`;
          suggestions = [`Check status of ${targetTaskId}`, "List in-progress tasks"];
        }
      } else if (/(?:assign)\s+(?:task\s+)?(TSK[A-Za-z0-9_-]+|[a-f0-9]{24})\s+(?:to\s+)(.+)/i.test(prompt)) {
        const match = prompt.match(/(?:assign)\s+(?:task\s+)?(TSK[A-Za-z0-9_-]+|[a-f0-9]{24})\s+(?:to\s+)(.+)/i);
        if (match) {
          const targetTaskId = match[1].trim();
          const targetMember = match[2].trim().replace(/[."']+$/, '');
          actions.push({ type: 'assign_task', taskId: targetTaskId, assigneeId: targetMember });
          aiText = `👤 Assigning task **${targetTaskId}** to **${targetMember}**...`;
          voiceText = `Assigning task ${targetTaskId} to ${targetMember}.`;
          suggestions = [`View ${targetTaskId}`, `List tasks for ${targetMember}`];
        }
      } else if (/(?:comment on|add comment to)\s+(?:task\s+)?(TSK[A-Za-z0-9_-]+|[a-f0-9]{24})\s*(?:saying|with|:)?\s*["']?([^"'\n]+)["']?/i.test(prompt)) {
        const match = prompt.match(/(?:comment on|add comment to)\s+(?:task\s+)?(TSK[A-Za-z0-9_-]+|[a-f0-9]{24})\s*(?:saying|with|:)?\s*["']?([^"'\n]+)["']?/i);
        if (match) {
          const targetTaskId = match[1].trim();
          const commentText = match[2].trim();
          actions.push({ type: 'add_comment', taskId: targetTaskId, text: commentText });
          aiText = `💬 Adding comment to **${targetTaskId}**: *"${commentText}"*`;
          voiceText = `Added comment to task ${targetTaskId}.`;
          suggestions = [`View ${targetTaskId}`, "List in-progress tasks"];
        }
      } else if (/in[\s_-]?progress/i.test(cleanPrompt)) {
        const inProgress = tasksContext.filter((t: any) => t.status === 'in_progress');
        if (inProgress.length === 0) {
          aiText = `There are currently no tasks in **In Progress** for this project.`;
          voiceText = `There are currently no tasks in progress for this project.`;
        } else {
          aiText = `Here are the **${inProgress.length}** task(s) currently in progress:\n\n` +
            inProgress.map((t: any) => `- **${t.taskNumber || t.id}**: ${t.title} *(Priority: ${t.priority})*`).join('\n');
          voiceText = `You have ${inProgress.length} tasks currently in progress.`;
        }
        suggestions = ["Show high priority bugs", "What tasks are assigned to me?"];
      } else if (/bug|critical|high priority/i.test(cleanPrompt)) {
        const bugs = tasksContext.filter((t: any) => t.priority === 'critical' || t.priority === 'high' || (t.title && t.title.toLowerCase().includes('bug')));
        if (bugs.length === 0) {
          aiText = `Great news! There are no high or critical priority bugs recorded in this project right now.`;
          voiceText = `There are no high or critical priority bugs in this project right now.`;
        } else {
          aiText = `Found **${bugs.length}** high/critical priority item(s):\n\n` +
            bugs.map((t: any) => `- **${t.taskNumber || t.id}**: ${t.title} *[Status: ${t.status.replace(/_/g, ' ')}, Priority: ${t.priority}]*`).join('\n');
          voiceText = `Found ${bugs.length} high priority items that need attention.`;
        }
        suggestions = ["List in-progress tasks", "Show all project tasks"];
      } else if (/assigned to me|my tasks|my task/i.test(cleanPrompt)) {
        const myTasks = tasksContext.filter((t: any) => userId && t.assignees.includes(userId));
        if (myTasks.length === 0) {
          aiText = `You currently have no tasks assigned directly to you in this project.`;
          voiceText = `You have no tasks assigned to you in this project right now.`;
        } else {
          aiText = `You have **${myTasks.length}** task(s) assigned to you:\n\n` +
            myTasks.map((t: any) => `- **${t.taskNumber || t.id}**: ${t.title} *(Status: ${t.status.replace(/_/g, ' ')}, Priority: ${t.priority})*`).join('\n');
          voiceText = `You have ${myTasks.length} tasks assigned to you.`;
        }
        suggestions = ["List in-progress tasks", "High Priority Bugs"];
      } else {
        const total = tasksContext.length;
        const byStatus = {
          to_do: tasksContext.filter((t: any) => t.status === 'to_do').length,
          in_progress: tasksContext.filter((t: any) => t.status === 'in_progress').length,
          in_review: tasksContext.filter((t: any) => t.status === 'in_review').length,
          completed: tasksContext.filter((t: any) => t.status === 'completed').length,
          backlog: tasksContext.filter((t: any) => t.status === 'backlog').length,
        };
        aiText = `Here is a summary of **${project?.name || 'this project'}** (${total} total tasks):\n\n` +
          `- **To Do:** ${byStatus.to_do}\n` +
          `- **In Progress:** ${byStatus.in_progress}\n` +
          `- **In Review:** ${byStatus.in_review}\n` +
          `- **Completed:** ${byStatus.completed}\n` +
          `- **Backlog:** ${byStatus.backlog}\n\n` +
          `Try commands like: *"List in-progress tasks"*, *"Move TSK26070010 to in progress"*, or *"Assign TSK26070012 to Tarun"*.`;
        voiceText = `This project has ${total} tasks: ${byStatus.in_progress} in progress and ${byStatus.completed} completed.`;
        suggestions = ["List In Progress Tasks", "High Priority Bugs", "What tasks are assigned to me?"];
      }
    };

    if (!provider) {
      // Offline/Local Agent Execution: Runs directly against MongoDB project state
      runLocalFallback();
    } else {
      // 5. Call LLM provider (Groq or NVIDIA NIM)
      let reply = '';
      const callProvider = async (modelName: string, timeoutMs: number = 9000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(provider.url, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${provider.apiKey}`
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
            throw new Error(`${provider.name} HTTP ${res.status}: ${errText}`);
          }
          const data = await res.json();
          return data.choices[0]?.message?.content?.trim() || '';
        } catch (err: any) {
          clearTimeout(timeoutId);
          throw err;
        }
      };

      try {
        reply = await callProvider(provider.model, 9000);
      } catch (primaryErr) {
        console.warn(`Primary model ${provider.model} failed:`, primaryErr);
        if (provider.name === 'nvidia' && provider.model !== 'meta/llama-3.1-8b-instruct') {
          try {
            reply = await callProvider('meta/llama-3.1-8b-instruct', 9000);
          } catch (fallbackErr) {
            console.warn('Fallback model also failed, using local agent fallback:', fallbackErr);
            runLocalFallback();
          }
        } else {
          // If remote LLM fails, cleanly fallback to local deterministic agent
          runLocalFallback();
        }
      }

      if (reply) {
        // Safe JSON parsing with fallback
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
          voiceText = parsed.voiceResponse || '';
          suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
          actions = Array.isArray(parsed.actions) ? parsed.actions : [];
        } catch (e) {
          aiText = reply.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
          voiceText = '';
          actions = [];
          suggestions = [];
        }
      }
    }

    // 7. Execute agentic actions in database
    let actionsExecutedCount = 0;
    const executedActionTypes: string[] = [];

    if (actions && Array.isArray(actions)) {
      for (const action of actions) {
        try {
          if (action.type === 'move_task' && action.taskId) {
            const task = await findTaskByIdOrNumber(action.taskId, projectId, effectiveCompanyId);
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
            const task = await findTaskByIdOrNumber(action.taskId, projectId, effectiveCompanyId);
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
            const task = await findTaskByIdOrNumber(action.taskId, projectId, effectiveCompanyId);
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
            const task = await findTaskByIdOrNumber(action.taskId, projectId, effectiveCompanyId);
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
              // companyId is authoritative from the session.
              const compId = new mongoose.Types.ObjectId(effectiveCompanyId);
              
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

    // 8. Return refreshed task list & AI response (always company-scoped)
    let updatedTasks: any[] = [];
    const queryFilter: any = { companyId: effectiveCompanyId };
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      queryFilter.projectId = projectId;
    }

    if (Object.keys(queryFilter).length > 0) {
      if (taskNumberMatches && taskNumberMatches.length > 0) {
        queryFilter.taskNumber = { $in: taskNumberMatches.map((t: string) => t.toUpperCase()) };
      } else if (prompt.match(/assigned to me|my tasks|my task|for me/i) && userId && mongoose.Types.ObjectId.isValid(userId)) {
        queryFilter.assignedTo = new mongoose.Types.ObjectId(userId);
      } else if (prompt.match(/bug|bugs/i)) {
        queryFilter.taskType = 'bug';
      } else if (prompt.match(/in progress|in_progress/i)) {
        queryFilter.status = 'in_progress';
      } else if (prompt.match(/overdue/i)) {
        queryFilter.dueDate = { $lt: new Date() };
        queryFilter.status = { $ne: 'completed' };
      } else if (prompt.match(/high priority|critical/i)) {
        queryFilter.priority = { $in: ['high', 'critical'] };
      }

      updatedTasks = await Task.find(queryFilter)
        .sort({ updatedAt: -1 })
        .limit(6)
        .populate('projectId', 'name projectNumber')
        .populate('assignedTo', 'name email department')
        .populate('assignedBy', 'name email')
        .lean();
    }

    return NextResponse.json({
      response: aiText,
      message: aiText,
      voiceResponse: voiceText || undefined,
      suggestions,
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
