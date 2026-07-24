import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectQuickAccess from '@/models/ProjectQuickAccess';

// GET - Fetch all quick access links for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const items = await ProjectQuickAccess.find({ projectId }).sort({ createdAt: 1 });
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error('Error fetching quick access items:', error);
    return NextResponse.json({ message: 'Failed to fetch quick access items' }, { status: 500 });
  }
}

// POST - Create or update a quick access link
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { projectId, title, url, id } = body;

    if (!projectId || !title || !url) {
      return NextResponse.json({ message: 'Project ID, title, and URL are required' }, { status: 400 });
    }

    let item;
    if (id) {
      item = await ProjectQuickAccess.findByIdAndUpdate(
        id,
        { title, url },
        { new: true }
      );
    } else {
      item = await ProjectQuickAccess.create({
        projectId,
        title,
        url
      });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error saving quick access item:', error);
    return NextResponse.json({ message: 'Failed to save quick access item' }, { status: 500 });
  }
}

// DELETE - Delete a quick access link
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Item ID is required' }, { status: 400 });
    }

    await ProjectQuickAccess.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Item deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting quick access item:', error);
    return NextResponse.json({ message: 'Failed to delete quick access item' }, { status: 500 });
  }
}
