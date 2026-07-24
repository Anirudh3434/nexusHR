import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectNote from '@/models/ProjectNote';

// GET - Fetch all notes for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags');
    const isFavorite = searchParams.get('isFavorite');
    const isPinned = searchParams.get('isPinned');
    
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const query: any = { projectId };
    
    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };
    if (isFavorite === 'true') query.isFavorite = true;
    if (isPinned === 'true') query.isPinned = true;

    const notes = await ProjectNote.find(query)
      .sort({ isPinned: -1, updatedAt: -1 });

    return NextResponse.json({ notes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ message: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST - Create a new note
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { projectId, title, content, tags, category, isPinned, isFavorite, userId, userName, userEmail } = body;

    if (!projectId || !title || !content) {
      return NextResponse.json({ message: 'Project ID, title, and content are required' }, { status: 400 });
    }

    const note = await ProjectNote.create({
      projectId,
      title,
      content,
      tags: tags || [],
      category: category || 'Other',
      isPinned: isPinned || false,
      isFavorite: isFavorite || false,
      versions: [{
        version: 1,
        content,
        editedBy: { _id: userId, name: userName, email: userEmail },
        editedAt: new Date()
      }],
      createdBy: { _id: userId, name: userName, email: userEmail },
      lastEditedBy: { _id: userId, name: userName, email: userEmail }
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ message: 'Failed to create note' }, { status: 500 });
  }
}
