// NexusHR AI HR Chat API Route
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


/**
 * GET: Fetch the employee's existing chat history and active conversation ID.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');

    if (!userId || !companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    let log: any = null;
    if (conversationId) {
      log = await AIConversationLog.findOne({
        _id: conversationId,
        userId,
        companyId,
      }).lean();
    }

    // If no specific conversation requested, find the most recently updated conversation
    if (!log) {
      log = await AIConversationLog.findOne({ userId, companyId })
        .sort({ updatedAt: -1 })
        .lean();
    }

    if (!log) {
      return NextResponse.json({ conversationId: null, messages: [] });
    }

    const formattedMessages = (log.messages || []).map((m: any) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      sources: m.sources || [],
    }));

    return NextResponse.json({
      conversationId: log._id.toString(),
      category: log.category,
      messages: formattedMessages,
    });
  } catch (error: any) {
    console.error('Error fetching HR Chat history:', error);
    return NextResponse.json({ message: 'Error fetching history', error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: Clear / reset conversation history for a new session.
 */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const companyId = headersList.get('x-company-id');

    if (!userId || !companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      await AIConversationLog.deleteOne({ _id: conversationId, userId, companyId });
    } else {
      // Delete most recent active conversation
      const latest = await AIConversationLog.findOne({ userId, companyId }).sort({ updatedAt: -1 });
      if (latest) {
        await AIConversationLog.deleteOne({ _id: latest._id });
      }
    }

    return NextResponse.json({ success: true, message: 'Chat history cleared' });
  } catch (error: any) {
    console.error('Error deleting HR Chat conversation:', error);
    return NextResponse.json({ message: 'Error clearing history', error: error.message }, { status: 500 });
  }
}

/**
 * POST: Send a message, load conversation context from DB, query AI, and store message history.
 */
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
    const { message, history = [], conversationId, newChat = false } = body;

    if (!message) {
      return NextResponse.json({ message: 'Message is required' }, { status: 400 });
    }

    // 1. Resolve existing conversation log for context
    let conversationLog: any = null;
    if (conversationId && !newChat) {
      conversationLog = await AIConversationLog.findOne({ _id: conversationId, userId, companyId });
    } else if (!newChat) {
      // Find the most recent active conversation for this user
      conversationLog = await AIConversationLog.findOne({ userId, companyId }).sort({ updatedAt: -1 });
    }

    // 2. Build consolidated conversation history from DB to feed as context to the AI
    let contextHistory: Array<{ role: string; content: string }> = [];

    if (conversationLog && Array.isArray(conversationLog.messages) && conversationLog.messages.length > 0) {
      // Use the last 16 messages stored in the database
      contextHistory = conversationLog.messages.slice(-16).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || '',
      }));
    } else if (Array.isArray(history) && history.length > 0) {
      // Fallback to client-provided history if no DB record found
      contextHistory = history.slice(-16).map((h: any) => ({
        role: h.sender === 'user' || h.role === 'user' ? 'user' : 'assistant',
        content: h.text || h.content || '',
      }));
    }

    // Fetch active knowledge base articles for the company
    const knowledgeArticles = await HRKnowledgeBase.find({
      companyId,
      isActive: true,
    }).select('_id title content category keywords priority').lean();

    const articles: KnowledgeArticle[] = knowledgeArticles.map(article => ({
      _id: article._id.toString(),
      title: article.title,
      content: article.content,
      category: article.category,
      keywords: article.keywords,
      priority: article.priority,
    }));

    // Query HR knowledge with full conversational context
    const queryInput: HRQueryInput = {
      question: message,
      companyId,
      userId,
      userName: userName || undefined,
      history: contextHistory,
    };

    // Bridge Nexi to the NexusHR MCP server (MongoDB-backed HR tools)
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

    // 3. Store conversation history into MongoDB
    const userMsgRecord = {
      role: 'user',
      content: message,
      timestamp: new Date(),
      sources: (result.sources || []).map(source => ({
        articleId: source.articleId,
        title: source.title,
        relevance: source.relevance,
      })),
    };

    const assistantMsgRecord = {
      role: 'assistant',
      content: result.response,
      timestamp: new Date(),
    };

    if (conversationLog) {
      conversationLog.messages.push(userMsgRecord);
      conversationLog.messages.push(assistantMsgRecord);
      conversationLog.category = result.category;
      conversationLog.markModified('messages');
      await conversationLog.save();
    } else {
      conversationLog = await AIConversationLog.create({
        userId,
        companyId,
        messages: [userMsgRecord, assistantMsgRecord],
        category: result.category,
      });
    }

    // Update view count for referenced articles
    if (result.sources && result.sources.length > 0) {
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
      mode: result.mode,
      conversationId: conversationLog._id.toString(),
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in HR Chat route:', error);
    return NextResponse.json({ message: 'Error in HR Chat', error: error.message }, { status: 500 });
  }
}
