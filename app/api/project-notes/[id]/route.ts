import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectNote from '@/models/ProjectNote';

// PATCH - Update note
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await req.json();
    
    const note = await ProjectNote.findById(id);
    if (!note) {
      return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    // Track version if content changed
    if (body.content !== undefined && body.content !== note.content) {
      const newVersion = note.versions.length + 1;
      note.versions.push({
        version: newVersion,
        content: body.content,
        editedBy: body.lastEditedBy,
        editedAt: new Date(),
        changeNotes: body.changeNotes
      });
    }

    // Update fields
    if (body.title !== undefined) note.title = body.title;
    if (body.content !== undefined) note.content = body.content;
    if (body.tags !== undefined) note.tags = body.tags;
    if (body.category !== undefined) note.category = body.category;
    if (body.isPinned !== undefined) note.isPinned = body.isPinned;
    if (body.isFavorite !== undefined) note.isFavorite = body.isFavorite;
    if (body.lastEditedBy) note.lastEditedBy = body.lastEditedBy;

    note.updatedAt = new Date();
    await note.save();

    return NextResponse.json({ note }, { status: 200 });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ message: 'Failed to update note' }, { status: 500 });
  }
}

// DELETE - Delete note
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    const note = await ProjectNote.findByIdAndDelete(id);
    if (!note) {
      return NextResponse.json({ message: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ message: 'Failed to delete note' }, { status: 500 });
  }
}
