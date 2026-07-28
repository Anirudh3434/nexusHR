import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AIConversationLog from '@/models/AIConversationLog';
import HRKnowledgeBase from '@/models/HRKnowledgeBase';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, rating, comment, articleId, helpful } = body;

    if (!conversationId) {
      return NextResponse.json({ message: 'Conversation ID is required' }, { status: 400 });
    }

    // Update conversation log with feedback
    const conversation = await AIConversationLog.findById(conversationId);
    
    if (!conversation) {
      return NextResponse.json({ message: 'Conversation not found' }, { status: 404 });
    }

    if (rating !== undefined) {
      conversation.satisfactionRating = rating;
    }
    
    if (comment !== undefined) {
      conversation.feedback = comment;
    }

    if (helpful !== undefined) {
      conversation.resolved = helpful;
      conversation.resolvedAt = new Date();
    }

    // Calculate session duration
    if (conversation.startedAt) {
      const endedAt = new Date();
      conversation.endedAt = endedAt;
      conversation.sessionDuration = Math.floor((endedAt.getTime() - conversation.startedAt.getTime()) / 1000);
    }

    await conversation.save();

    // Update article helpfulness if articleId provided
    if (articleId && helpful !== undefined) {
      const updateField = helpful ? 'helpfulCount' : 'notHelpfulCount';
      await HRKnowledgeBase.findByIdAndUpdate(
        articleId,
        { $inc: { [updateField]: 1 } }
      );
    }

    return NextResponse.json({ message: 'Feedback recorded successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error recording feedback:', error);
    return NextResponse.json({ message: 'Error recording feedback', error: error.message }, { status: 500 });
  }
}
