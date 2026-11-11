import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import Project from '@/models/Project';
import ActivityLog from '@/models/ActivityLog';
import mongoose from 'mongoose';
import { headers } from 'next/headers';
import { getAuthInfo } from '@/lib/auth-util';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    const headersList = await headers();
    const body = await req.json().catch(() => ({}));

    // Identity comes from the session ONLY — no body fallbacks.
    const userId = auth.userId;
    const userName = headersList.get('x-user-name') || 'User';
    const { projectId, prompt } = body;

    if (!projectId || !prompt) {
      return NextResponse.json({ message: 'Project ID and prompt are required' }, { status: 400 });
    }

    // 1. Fetch project members context (project must belong to the session company)
    const project = await Project.findOne({ _id: projectId, companyId: auth.companyId })
      .populate('managerId', 'name email')
      .populate('members.employeeId', 'name email');

    if (!project) {
      return NextResponse.json({ message: 'Forbidden: project not found in your company' }, { status: 403 });
    }

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
          model: 'meta/llama-3.1-8b-instruct'
        }
      : null;

    let target = 'Task';
    let query: any = null;
    let explanation = '';

    // Smart local fallback in case LLM is unavailable or fails
    const runLocalFallback = () => {
      const q: any = {
        projectId: new mongoose.Types.ObjectId(projectId),
        companyId: new mongoose.Types.ObjectId(auth.companyId)
      };

      const lower = prompt.toLowerCase().trim();

      // Status filters
      if (/in[\s_-]?progress/i.test(lower)) {
        q.status = 'in_progress';
      } else if (/completed|done|closed/i.test(lower)) {
        q.status = 'completed';
      } else if (/to[\s_-]?do|pending|open/i.test(lower)) {
        q.status = 'to_do';
      } else if (/backlog/i.test(lower)) {
        q.status = 'backlog';
      } else if (/in[\s_-]?review|qa/i.test(lower)) {
        q.status = 'in_review';
      }

      // Priority filters
      if (/critical/i.test(lower)) {
        q.priority = 'critical';
      } else if (/high\s+priority|urgent/i.test(lower)) {
        q.priority = { $in: ['high', 'critical'] };
      }

      // Type filters
      if (/\bbug(s)?\b/i.test(lower)) {
        q.taskType = 'bug';
      }

      // Assigned to me
      if (/assigned\s+to\s+me|my\s+task(s)?/i.test(lower) && userId && mongoose.Types.ObjectId.isValid(userId)) {
        q.assignedTo = new mongoose.Types.ObjectId(userId);
      }

      // Keyword search: strip common filler words
      const cleanKeywords = lower
        .replace(/\b(give|show|list|find|get|tasks?|related\s+to|all|about|with|for|me|in|the|a|an|please)\b/gi, ' ')
        .replace(/[^a-z0-9_-]/gi, ' ')
        .trim();

      if (cleanKeywords && cleanKeywords.length > 1) {
        const words = cleanKeywords.split(/\s+/).filter((w: string) => w.length > 1);
        if (words.length > 0) {
          const regexPattern = words.join('|');
          q.$or = [
            { title: { $regex: regexPattern, $options: 'i' } },
            { description: { $regex: regexPattern, $options: 'i' } },
            { taskNumber: { $regex: regexPattern, $options: 'i' } }
          ];
        }
      }

      return {
        target: 'Task',
        query: q,
        explanation: `Filtered tasks matching "${cleanKeywords || prompt}"`
      };
    };

    if (provider) {
      try {
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 1024
          })
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices[0]?.message?.content?.trim();
          if (reply) {
            const match = reply.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            const jsonText = match ? match[1] : reply;
            const parsed = JSON.parse(jsonText.trim());
            if (parsed && parsed.query) {
              target = parsed.target || 'Task';
              query = parsed.query;
              explanation = parsed.explanation || '';
            }
          }
        } else {
          console.warn(`${provider.name} API returned non-OK status:`, response.status);
        }
      } catch (llmErr) {
        console.warn('LLM query generation failed, using local fallback:', llmErr);
      }
    }

    // Fallback if no provider or LLM didn't return a valid query
    if (!query) {
      const fallbackResult = runLocalFallback();
      target = fallbackResult.target;
      query = fallbackResult.query;
      explanation = fallbackResult.explanation;
    }

    query.projectId = projectId;
    // Tenant lock: the LLM-generated query can never escape the session company.
    // Strip dangerous operators the model must not use.
    for (const key of Object.keys(query)) {
      if (key === '$where' || key === '$function' || key === '$accumulator') delete query[key];
    }
    query.companyId = auth.companyId;

    let finalTasks: any[] = [];
    if (target === 'ActivityLog') {
      const logs = await ActivityLog.find({ ...query, companyId: auth.companyId }).select('taskId').lean();
      const taskIds = logs.map(l => l.taskId).filter(Boolean) as mongoose.Types.ObjectId[];

      finalTasks = await Task.find({ _id: { $in: taskIds }, companyId: auth.companyId })
        .populate('projectId', 'name projectNumber')
        .populate('assignedTo', 'name email department')
        .populate('assignedBy', 'name email')
        .populate('createdBy', 'name email')
        .lean();
    } else {
      finalTasks = await Task.find({ ...query, companyId: auth.companyId })
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
