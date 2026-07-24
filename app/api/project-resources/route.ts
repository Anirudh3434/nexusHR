import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectResource from '@/models/ProjectResource';

// GET - Fetch all resources for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags');
    const isFavorite = searchParams.get('isFavorite');
    
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const query: any = { projectId };
    
    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };
    if (isFavorite === 'true') query.isFavorite = true;

    const resources = await ProjectResource.find(query)
      .sort({ isFavorite: -1, updatedAt: -1 });

    return NextResponse.json({ resources }, { status: 200 });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json({ message: 'Failed to fetch resources' }, { status: 500 });
  }
}

// POST - Create a new resource
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { projectId, title, url, description, category, tags, isFavorite, userId, userName, userEmail } = body;

    if (!projectId || !title || !url) {
      return NextResponse.json({ message: 'Project ID, title, and URL are required' }, { status: 400 });
    }

    const resource = await ProjectResource.create({
      projectId,
      title,
      url,
      description,
      category: category || 'Other',
      tags: tags || [],
      isFavorite: isFavorite || false,
      createdBy: { _id: userId, name: userName, email: userEmail },
      lastUpdatedBy: { _id: userId, name: userName, email: userEmail }
    });

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json({ message: 'Failed to create resource' }, { status: 500 });
  }
}
