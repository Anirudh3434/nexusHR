import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectDocument from '@/models/ProjectDocument';
import ProjectNote from '@/models/ProjectNote';
import ProjectCredential from '@/models/ProjectCredential';
import ProjectResource from '@/models/ProjectResource';

// GET - Global search across all project docs
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // 'all', 'documents', 'notes', 'credentials', 'resources'
    
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }
    
    if (!query) {
      return NextResponse.json({ message: 'Search query is required' }, { status: 400 });
    }

    const searchRegex = new RegExp(query, 'i');
    const results: any = {
      documents: [],
      notes: [],
      credentials: [],
      resources: []
    };

    // Search documents
    if (type === 'all' || type === 'documents') {
      results.documents = await ProjectDocument.find({
        projectId,
        isDeleted: false,
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { notes: searchRegex },
          { tags: searchRegex }
        ]
      }).select('title description category fileName uploadedAt isFavorite').limit(20);
    }

    // Search notes
    if (type === 'all' || type === 'notes') {
      results.notes = await ProjectNote.find({
        projectId,
        $or: [
          { title: searchRegex },
          { content: searchRegex },
          { tags: searchRegex }
        ]
      }).select('title content category isPinned isFavorite updatedAt').limit(20);
    }

    // Search credentials (excluding sensitive data)
    if (type === 'all' || type === 'credentials') {
      const credentials = await ProjectCredential.find({
        projectId,
        $or: [
          { service: searchRegex },
          { username: searchRegex },
          { email: searchRegex },
          { tags: searchRegex }
        ]
      }).select('service environment category loginUrl username email isFavorite expiryDate').limit(20);
      
      // Mask sensitive fields
      results.credentials = credentials.map(cred => cred.toObject());
    }

    // Search resources
    if (type === 'all' || type === 'resources') {
      results.resources = await ProjectResource.find({
        projectId,
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { url: searchRegex },
          { tags: searchRegex }
        ]
      }).select('title url description category isFavorite updatedAt').limit(20);
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Error searching project docs:', error);
    return NextResponse.json({ message: 'Failed to search' }, { status: 500 });
  }
}
