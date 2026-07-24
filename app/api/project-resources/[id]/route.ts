import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectResource from '@/models/ProjectResource';

// PATCH - Update resource
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await req.json();
    
    const resource = await ProjectResource.findById(id);
    if (!resource) {
      return NextResponse.json({ message: 'Resource not found' }, { status: 404 });
    }

    // Update fields
    if (body.title !== undefined) resource.title = body.title;
    if (body.url !== undefined) resource.url = body.url;
    if (body.description !== undefined) resource.description = body.description;
    if (body.category !== undefined) resource.category = body.category;
    if (body.tags !== undefined) resource.tags = body.tags;
    if (body.isFavorite !== undefined) resource.isFavorite = body.isFavorite;
    if (body.lastUpdatedBy) resource.lastUpdatedBy = body.lastUpdatedBy;

    resource.updatedAt = new Date();
    await resource.save();

    return NextResponse.json({ resource }, { status: 200 });
  } catch (error) {
    console.error('Error updating resource:', error);
    return NextResponse.json({ message: 'Failed to update resource' }, { status: 500 });
  }
}

// DELETE - Delete resource
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    const resource = await ProjectResource.findByIdAndDelete(id);
    if (!resource) {
      return NextResponse.json({ message: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Resource deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json({ message: 'Failed to delete resource' }, { status: 500 });
  }
}
