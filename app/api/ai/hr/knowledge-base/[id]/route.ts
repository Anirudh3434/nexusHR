import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import HRKnowledgeBase from '@/models/HRKnowledgeBase';
import { headers } from 'next/headers';

// PUT - Update knowledge base article (Admin/HR only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role');

    if (!companyId || !userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only admins and HR can update articles
    if (userRole !== 'admin' && userRole !== 'hr') {
      return NextResponse.json({ message: 'Forbidden - Admin/HR only' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { category, title, content, keywords, priority, isActive } = body;

    // Find the article and verify it belongs to the company
    const article = await HRKnowledgeBase.findOne({ _id: id, companyId });

    if (!article) {
      return NextResponse.json({ message: 'Article not found' }, { status: 404 });
    }

    // Update fields
    if (category !== undefined) article.category = category;
    if (title !== undefined) article.title = title;
    if (content !== undefined) article.content = content;
    if (keywords !== undefined) article.keywords = keywords;
    if (priority !== undefined) article.priority = priority;
    if (isActive !== undefined) article.isActive = isActive;
    
    article.lastUpdated = new Date();
    article.lastUpdatedBy = userId;

    await article.save();

    return NextResponse.json({ article }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating knowledge base article:', error);
    return NextResponse.json({ message: 'Error updating article', error: error.message }, { status: 500 });
  }
}

// DELETE - Delete knowledge base article (Admin/HR only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const userRole = headersList.get('x-user-role');

    if (!companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only admins and HR can delete articles
    if (userRole !== 'admin' && userRole !== 'hr') {
      return NextResponse.json({ message: 'Forbidden - Admin/HR only' }, { status: 403 });
    }

    const { id } = await params;

    // Find and verify the article belongs to the company
    const article = await HRKnowledgeBase.findOneAndDelete({ _id: id, companyId });

    if (!article) {
      return NextResponse.json({ message: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Article deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error deleting knowledge base article:', error);
    return NextResponse.json({ message: 'Error deleting article', error: error.message }, { status: 500 });
  }
}
