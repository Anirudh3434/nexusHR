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
    const body = await req.json().catch(() => ({}));

    const userId = headersList.get('x-user-id') || body.userId || body.user?.id || 'current-user';
    const userName = headersList.get('x-user-name') || body.userName || body.user?.name || 'User';
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
   - \`dueDate\`: Date
   - \`taskNumber\`: String (e.g. 'TSK26070004')
   - \`title\`: String
   - \`description\`: String

2. \`ActivityLog\` (stores history of status changes and transitions):
   - \`projectId\`: ObjectId
   - \`taskId\`: ObjectId (references Task)
   - \`actionType\`: String (enum: 'status_changed', 'custom_status_changed', etc.)
   - \`newValue\`: Mixed (new status name, e.g. 'QA', 'Staging')

The current context:
- Current Project ID: "${projectId}" (ALWAYS include this as "projectId" in the query object)
- Current User ID: "${userId}"
- Current User Name: "${userName}"
- Current Date/Time: "${currentDate}"
- Project members: ${JSON.stringify(membersContext)}

Output ONLY a JSON object:
{
  "target": "Task" | "ActivityLog",
  "query": { "projectId": "${projectId}", ... },
  "explanation": "Brief description"
}
Output raw JSON only.`;

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: 'NVIDIA API key not configured' }, { status: 500 });
    }

    // 3. Call NVIDIA API with fast 8B model
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
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

    let parsed;
    try {
      const match = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      const jsonText = match ? match[1] : reply;
      parsed = JSON.parse(jsonText.trim());
    } catch (e) {
      console.error('Failed to parse AI query response:', reply);
      return NextResponse.json({ message: 'AI did not return a valid query object', rawResponse: reply }, { status: 502 });
    }

    const { target, query, explanation } = parsed;
    if (!query) {
      return NextResponse.json({ message: 'AI failed to construct a query', rawResponse: reply }, { status: 502 });
    }

    query.projectId = projectId;

    let finalTasks: any[] = [];
    if (target === 'ActivityLog') {
      const logs = await ActivityLog.find(query).select('taskId').lean();
      const taskIds = logs.map(l => l.taskId).filter(Boolean) as mongoose.Types.ObjectId[];
      
      finalTasks = await Task.find({ _id: { $in: taskIds } })
        .populate('projectId', 'name projectNumber')
        .populate('assignedTo', 'name email department')
        .populate('assignedBy', 'name email')
        .populate('createdBy', 'name email')
        .lean();
    } else {
      finalTasks = await Task.find(query)
        .populate('projectId', 'name projectNumber')
        .populate('assignedTo', 'name email department')
        .populate('assignedBy', 'name email')
        .populate('createdBy', 'name email')
        .lean();
    }

    return NextResponse.json({ tasks: finalTasks, explanation, query }, { status: 200 });
  } catch (error: any) {
    console.error('Error in AI query route:', error);
    return NextResponse.json({ message: 'Error in AI query', error: error.message }, { status: 500 });
  }
}
