import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import HRKnowledgeBase from '@/models/HRKnowledgeBase';
import AIConversationLog from '@/models/AIConversationLog';
import { queryHRKnowledge, KnowledgeArticle, HRQueryInput } from '@/lib/nvidia-ai';
import { headers } from 'next/headers';

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
      history: history.map((h: any) => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: h.text
      }))
    };

    const result = await queryHRKnowledge(queryInput, articles);

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
