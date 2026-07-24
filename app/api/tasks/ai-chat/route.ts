import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import Project from '@/models/Project';
import ActivityLog from '@/models/ActivityLog';
import User from '@/models/User';
import mongoose from 'mongoose';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name') || 'Tarun';

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, prompt, history = [] } = body;

    if (!projectId || !prompt) {
      return NextResponse.json({ message: 'Project ID and prompt are required' }, { status: 400 });
    }

    // 1. Load context: project, members, tasks
    const project = await Project.findById(projectId)
      .populate('managerId', 'name email')
      .populate('members.employeeId', 'name email');

    const companyMembers = await User.find({ companyId: project?.companyId }).select('name email').lean();
    
    // Optimize: query only referenced tasks if TSK IDs are explicitly mentioned in prompt.
    // Otherwise, fetch the 40 most recently updated tasks to keep context size low and query speeds high.
    let projectTasks: any[] = [];
    const taskNumberMatches = prompt.match(/TSK\d+/gi);
    if (taskNumberMatches && taskNumberMatches.length > 0) {
      projectTasks = await Task.find({
        projectId,
        taskNumber: { $in: taskNumberMatches.map((t: string) => t.toUpperCase()) }
      }).lean();
    } else {
      projectTasks = await Task.find({ projectId })
        .sort({ updatedAt: -1 })
        .limit(40)
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

    // 2. Build system prompt
    const systemPrompt = `You are NexusAI, an advanced agentic project management AI assistant.
Your job is to answer questions about tasks and execute workspace operations requested by the user.

Available Operations:
1. "move_task": Moves a task to a different status.
   Format: { "type": "move_task", "taskId": "task-id", "status": "new-status" }
   Status options: 'backlog', 'to_do', 'in_progress', 'in_review', 'completed'
2. "add_comment": Adds a comment to a task.
   Format: { "type": "add_comment", "taskId": "task-id", "text": "comment text" }
3. "assign_task": Assigns a task to a specific user.
   Format: { "type": "assign_task", "taskId": "task-id", "assigneeId": "user-id" }

Current Context:
- Current Project ID: "${projectId}"
- Current User ID ("me" or "my"): "${userId}"
- Current User Name: "${userName}"
- Current Date/Time: "${currentDate}"
- Company Members list: ${JSON.stringify(membersContext)}
- Project Tasks list: ${JSON.stringify(tasksContext)}

Instructions:
- When a user asks a question, answer it clearly in markdown with clean visual layouts (using tables, lists, bold text, or badges).
- When a user asks you to perform an action (e.g. "move TSK26070010 to in progress", "comment on TSK26070011 saying 'done' and mention Tarun", "assign all in progress tasks to Tarun"), identify the matching taskIds and userIds from the context, and specify the actions in the "actions" array of your JSON output.
- You can execute multiple actions in a single prompt (e.g., status changes, assignments, and comment creations).
- For status inputs: map terms like "in progress" -> "in_progress", "todo" or "to do" -> "to_do", "review" -> "in_review", "done" or "complete" -> "completed", "backlog" -> "backlog".
- If the user asks a general question, leave the "actions" array empty.

You MUST respond ONLY with a valid JSON object matching the following structure:
{
  "response": "Your markdown-formatted message to the user.",
  "actions": [
    { "type": "move_task", "taskId": "...", "status": "..." }
  ]
}
Do not wrap your output in markdown code blocks. Output raw JSON.`;

    // 3. Format message history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((h: any) => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: h.text
      })),
      { role: 'user', content: prompt }
    ];

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'NVIDIA API key not configured' }, { status: 500 });
    }

    // 4. Call NVIDIA NIM
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages,
        temperature: 0.2,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('NVIDIA AI Chat error:', errText);
      return NextResponse.json({ message: 'Failed to call AI model', details: errText }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ message: 'AI returned an empty response' }, { status: 502 });
    }

    // Parse the JSON from reply
    let parsed;
    try {
      let jsonText = reply;
      const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
      const match = reply.match(codeBlockRegex);
      if (match) {
        jsonText = match[1];
      } else {
        const firstBrace = reply.indexOf('{');
        const lastBrace = reply.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonText = reply.substring(firstBrace, lastBrace + 1);
        }
      }
      parsed = JSON.parse(jsonText.trim());
    } catch (e) {
      console.error('Failed to parse AI response:', reply);
      return NextResponse.json({ message: 'AI did not return a valid JSON object', rawResponse: reply }, { status: 502 });
    }

    const { response: aiText, actions = [] } = parsed;

    // 5. Execute actions in database
    if (actions && Array.isArray(actions)) {
      for (const action of actions) {
        if (action.type === 'move_task' && action.taskId && action.status) {
          await Task.findByIdAndUpdate(action.taskId, { status: action.status });
          await ActivityLog.create({
            projectId,
            companyId: project?.companyId,
            userId: new mongoose.Types.ObjectId(userId),
            userName,
            taskId: new mongoose.Types.ObjectId(action.taskId),
            actionType: 'status_changed',
            fieldName: 'status',
            newValue: action.status,
            description: `NexusAI moved task to ${action.status}`
          });
        } else if (action.type === 'assign_task' && action.taskId && action.assigneeId) {
          await Task.findByIdAndUpdate(action.taskId, {
            assignedTo: [new mongoose.Types.ObjectId(action.assigneeId)]
          });
          await ActivityLog.create({
            projectId,
            companyId: project?.companyId,
            userId: new mongoose.Types.ObjectId(userId),
            userName,
            taskId: new mongoose.Types.ObjectId(action.taskId),
            actionType: 'assignee_changed',
            fieldName: 'assignedTo',
            newValue: [action.assigneeId],
            description: `NexusAI assigned task to user`
          });
        } else if (action.type === 'add_comment' && action.taskId && action.text) {
          await Task.findByIdAndUpdate(action.taskId, {
            $push: {
              comments: {
                userId: new mongoose.Types.ObjectId(userId),
                userName,
                text: action.text,
                createdAt: new Date(),
                attachments: []
              }
            }
          });
          await ActivityLog.create({
            projectId,
            companyId: project?.companyId,
            userId: new mongoose.Types.ObjectId(userId),
            userName,
            taskId: new mongoose.Types.ObjectId(action.taskId),
            actionType: 'comment_added',
            fieldName: 'comments',
            description: `NexusAI added comment: "${action.text}"`
          });
        }
      }
    }

    // 6. Return updated tasks and AI response
    const updatedTasks = await Task.find({ projectId })
      .populate('projectId', 'name projectNumber')
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name email')
      .populate('dependsOn', 'taskNumber title status')
      .populate('blocks', 'taskNumber title status')
      .populate('parentId', 'taskNumber title status')
      .populate('createdBy', 'name email');

    return NextResponse.json({
      response: aiText,
      tasks: updatedTasks,
      actionsExecuted: actions.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in AI Chat route:', error);
    return NextResponse.json({ message: 'Error in AI Chat', error: error.message }, { status: 500 });
  }
}
