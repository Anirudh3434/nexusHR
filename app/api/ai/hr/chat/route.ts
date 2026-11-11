import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import HRKnowledgeBase from '@/models/HRKnowledgeBase';
import AIConversationLog from '@/models/AIConversationLog';
import User from '@/models/User';
import { queryHRKnowledge, KnowledgeArticle, HRQueryInput } from '@/lib/nvidia-ai';
import { createHrBotToolkit } from '@/lib/mcp-hrbot';
import type { UserContext } from '@/mcp-server/auth';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');
    const userName = headersList.get('x-user-name');

    if (!userId || !companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, history = [], conversationId } = body;

    if (!message) {
      return NextResponse.json({ message: 'Message is required' }, { status: 400 });
    }

    // Fetch active knowledge base articles for the company
    const knowledgeArticles = await HRKnowledgeBase.find({
      companyId,
      isActive: true
    }).select('_id title content category keywords priority').lean();

    // Convert to KnowledgeArticle format
    const articles: KnowledgeArticle[] = knowledgeArticles.map(article => ({
      _id: article._id.toString(),
      title: article.title,
      content: article.content,
      category: article.category,
      keywords: article.keywords,
      priority: article.priority
    }));

    // Query HR knowledge
    const queryInput: HRQueryInput = {
      question: message,
      companyId,
      userId,
      userName: userName || undefined,
      history: history.map((h: any) => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: h.text
      }))
    };

    // Bridge Nexi to the NexusHR MCP server (MongoDB-backed HR tools), scoped to
    // the signed-in employee. Read-only unless HR_BOT_MCP_ALLOW_WRITE=true.
    const userRole = (headersList.get('x-user-role') || 'employee') as UserContext['role'];
    const userEmail = headersList.get('x-user-email') || '';

    let toolkit: Awaited<ReturnType<typeof createHrBotToolkit>> | undefined;
    try {
      const dbUser = await User.findById(userId)
        .select('name email role department designation')
        .lean() as any;

      toolkit = await createHrBotToolkit({
        id: userId,
        name: dbUser?.name || userName || 'Employee',
        email: dbUser?.email || userEmail,
        role: (dbUser?.role || userRole) as UserContext['role'],
        companyId,
        department: dbUser?.department,
        designation: dbUser?.designation,
        // Internal session context: no token scopes, the role permission matrix applies.
        tokenPermissions: [],
        allowedModules: [],
      });
      queryInput.toolkit = toolkit;
    } catch (mcpError: any) {
      console.warn('[Nexi] MCP toolkit unavailable, answering from knowledge base only:', mcpError.message);
    }

    let result: Awaited<ReturnType<typeof queryHRKnowledge>>;
    try {
      result = await queryHRKnowledge(queryInput, articles);
    } finally {
      await toolkit?.close?.();
    }

    // Log conversation
    let conversationLog;
    if (conversationId) {
      // Update existing conversation
      conversationLog = await AIConversationLog.findById(conversationId);
      if (conversationLog) {
        conversationLog.messages.push({
          role: 'user',
          content: message,
          timestamp: new Date(),
          sources: result.sources.map(source => ({
            articleId: source.articleId,
            title: source.title,
            relevance: source.relevance
          }))
        });
        conversationLog.messages.push({
          role: 'assistant',
          content: result.response,
          timestamp: new Date()
        });
        conversationLog.category = result.category;
        await conversationLog.save();
      }
    }

    if (!conversationLog) {
      // Create new conversation
      conversationLog = await AIConversationLog.create({
        userId,
        companyId,
        messages: [
          {
            role: 'user',
            content: message,
            timestamp: new Date(),
            sources: result.sources.map(source => ({
              articleId: source.articleId,
              title: source.title,
              relevance: source.relevance
            }))
          },
          {
            role: 'assistant',
            content: result.response,
            timestamp: new Date()
          }
        ],
        category: result.category
      });
    }

    // Update view count for referenced articles
    if (result.sources.length > 0) {
      const articleIds = result.sources.map(s => s.articleId);
      await HRKnowledgeBase.updateMany(
        { _id: { $in: articleIds } },
        { $inc: { viewCount: 1 } }
      );
    }

    return NextResponse.json({
      response: result.response,
      sources: result.sources,
      category: result.category,
      conversationId: conversationLog._id.toString()
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in HR Chat route:', error);
    return NextResponse.json({ message: 'Error in HR Chat', error: error.message }, { status: 500 });
  }
}
