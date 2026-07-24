import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import Project from '@/models/Project';
import ActivityLog from '@/models/ActivityLog';
import mongoose from 'mongoose';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const userName = headersList.get('x-user-name') || 'Tarun'; // fallback if not in headers

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, prompt } = body;

    if (!projectId || !prompt) {
      return NextResponse.json({ message: 'Project ID and prompt are required' }, { status: 400 });
    }

    // 1. Fetch project members context
    const project = await Project.findById(projectId)
      .populate('managerId', 'name email')
      .populate('members.employeeId', 'name email');

    const membersContext: any[] = [];
    if (project) {
      if (project.managerId) {
        membersContext.push({ id: (project.managerId as any)._id.toString(), name: (project.managerId as any).name, role: 'manager' });
      }
      if (project.members) {
        project.members.forEach((m: any) => {
          if (m.employeeId) {
            membersContext.push({ id: m.employeeId._id.toString(), name: m.employeeId.name, role: m.role });
          }
        });
      }
    }

    const currentDate = new Date().toISOString();

    // 2. Build LLM prompt
    const systemPrompt = `You are a database query generator for a Project Management system. Your task is to translate natural language questions into MongoDB/Mongoose query objects.
The database has two relevant collections:
1. \`Task\`:
   - \`projectId\`: ObjectId
   - \`status\`: String (options: 'backlog', 'to_do', 'in_progress', 'in_review', 'completed')
   - \`priority\`: String ('low', 'medium', 'high', 'critical')
   - \`taskType\`: String ('task', 'bug', 'story', 'epic')
   - \`assignedTo\`: Array of ObjectIds (references User)
   - \`labels\`: Array of label ObjectIds
   - \`dueDate\`: Date
   - \`storyPoints\`: Number
   - \`taskNumber\`: String (e.g. 'TSK26070004')
   - \`title\`: String
   - \`description\`: String
   - \`createdAt\`: Date

2. \`ActivityLog\` (stores history of status changes and transitions):
   - \`projectId\`: ObjectId
   - \`taskId\`: ObjectId (references Task)
   - \`actionType\`: String (enum: 'status_changed', 'custom_status_changed', etc.)
   - \`newValue\`: Mixed (new status name, e.g. 'QA', 'Staging', 'Deployed to QA')
   - \`createdAt\`: Date

The current context:
- Current Project ID: "${projectId}" (ALWAYS include this as "projectId" in the query object)
- Current User ID ("me" or "my"): "${userId}"
- Current User Name: "${userName}"
- Current Date/Time: "${currentDate}"
- List of project members: ${JSON.stringify(membersContext)}

You must output a JSON object containing:
- \`target\`: 'Task' | 'ActivityLog' (choose 'ActivityLog' if the question is history-based about transitions/status changes/deployments, e.g. "what was deployed to QA", otherwise 'Task')
- \`query\`: The Mongoose query object. For ObjectId fields, use string representations. For text regex, use regex syntax. E.g. { "projectId": "${projectId}", "status": "in_progress", "assignedTo": { "$in": ["${userId}"] } }
- \`explanation\`: A brief explanation of the query.

Example 1: "today tasks to me in progress"
{
  "target": "Task",
  "query": { "projectId": "${projectId}", "status": "in_progress", "assignedTo": { "$in": ["${userId}"] } },
  "explanation": "Tasks assigned to you that are currently in progress"
}

Example 2: "tasks deployed to stage"
{
  "target": "ActivityLog",
  "query": { "projectId": "${projectId}", "actionType": { "$in": ["status_changed", "custom_status_changed"] }, "newValue": { "$regex": "stage|staging", "$options": "i" } },
  "explanation": "Tasks that transitioned to stage or staging status"
}

Do not include markdown tags or code blocks in your response. Output only valid JSON.`;

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'NVIDIA API key not configured' }, { status: 500 });
    }

    // 3. Call NVIDIA API
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('NVIDIA API error:', errText);
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
      // Strip markdown code block wrappers if any
      const cleaned = reply.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse AI response:', reply);
      return NextResponse.json({ message: 'AI did not return a valid JSON object', rawResponse: reply }, { status: 502 });
    }

    const { target, query, explanation } = parsed;
    if (!query) {
      return NextResponse.json({ message: 'AI failed to construct a query', rawResponse: reply }, { status: 502 });
    }

    // Ensure projectId is set
    query.projectId = projectId;

    let finalTasks: any[] = [];
    if (target === 'ActivityLog') {
      // Query ActivityLogs to find taskId references
      const logs = await ActivityLog.find(query).select('taskId').lean();
      const taskIds = logs.map(l => l.taskId).filter(Boolean) as mongoose.Types.ObjectId[];
      
      // Fetch these tasks
      finalTasks = await Task.find({ _id: { $in: taskIds } })
        .populate('projectId', 'name projectNumber')
        .populate('assignedTo', 'name email department')
        .populate('assignedBy', 'name email')
        .populate('dependsOn', 'taskNumber title status')
        .populate('blocks', 'taskNumber title status')
        .populate('parentId', 'taskNumber title status')
        .populate('createdBy', 'name email');
    } else {
      // Query Task directly
      finalTasks = await Task.find(query)
        .populate('projectId', 'name projectNumber')
        .populate('assignedTo', 'name email department')
        .populate('assignedBy', 'name email')
        .populate('dependsOn', 'taskNumber title status')
        .populate('blocks', 'taskNumber title status')
        .populate('parentId', 'taskNumber title status')
        .populate('createdBy', 'name email');
    }

    return NextResponse.json({ tasks: finalTasks, explanation, query }, { status: 200 });
  } catch (error: any) {
    console.error('Error in AI query route:', error);
    return NextResponse.json({ message: 'Error in AI query', error: error.message }, { status: 500 });
  }
}
