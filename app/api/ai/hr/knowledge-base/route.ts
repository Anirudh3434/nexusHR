import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import HRKnowledgeBase from '@/models/HRKnowledgeBase';
import { headers } from 'next/headers';

// GET - Fetch knowledge base articles
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const userRole = headersList.get('x-user-role');

    if (!companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    // Build query
    const query: any = { companyId };
    
    if (category) {
      query.category = category;
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const articles = await HRKnowledgeBase.find(query)
      .sort({ priority: -1, lastUpdated: -1 })
      .lean();

    return NextResponse.json({ articles }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching knowledge base:', error);
    return NextResponse.json({ message: 'Error fetching knowledge base', error: error.message }, { status: 500 });
  }
}

// POST - Create new knowledge base article (Admin/HR only)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const userId = headersList.get('x-user-id');
    const userRole = headersList.get('x-user-role');

    if (!companyId || !userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only admins and HR can create articles
    if (userRole !== 'admin' && userRole !== 'hr') {
      return NextResponse.json({ message: 'Forbidden - Admin/HR only' }, { status: 403 });
    }

    const body = await req.json();
    const { category, title, content, keywords, priority = 0 } = body;

    if (!category || !title || !content) {
      return NextResponse.json({ message: 'Category, title, and content are required' }, { status: 400 });
    }

    const article = await HRKnowledgeBase.create({
      companyId,
      category,
      title,
      content,
      keywords: keywords || [],
      priority,
      lastUpdatedBy: userId,
      isActive: true
    });

    return NextResponse.json({ article }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating knowledge base article:', error);
    return NextResponse.json({ message: 'Error creating article', error: error.message }, { status: 500 });
  }
}
