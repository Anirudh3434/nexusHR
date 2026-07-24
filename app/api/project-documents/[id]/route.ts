import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectDocument from '@/models/ProjectDocument';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// PATCH - Update document
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await req.json();
    
    const document = await ProjectDocument.findById(id);
    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Handle file upload for new version
    if (body.fileData) {
      const { fileData, userId, userName, userEmail, changeNotes } = body;
      
      // Upload new version to Cloudinary
      const buffer = Buffer.from(fileData.data, 'base64');
      
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { 
            resource_type: 'auto',
            folder: `project-docs/${document.projectId}`,
            use_filename: true,
            unique_filename: true
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      const result = uploadResult as any;
      
      // Increment version
      const newVersion = document.version + 1;
      
      // Add to versions array
      document.versions.push({
        version: newVersion,
        fileUrl: result.secure_url,
        fileName: fileData.name,
        fileSize: fileData.size,
        uploadedBy: { _id: userId, name: userName, email: userEmail },
        uploadedAt: new Date(),
        changeNotes
      });
      
      // Update current file info
      document.fileUrl = result.secure_url;
      document.fileName = fileData.name;
      document.fileSize = fileData.size;
      document.version = newVersion;
    }

    // Update other fields
    if (body.title !== undefined) document.title = body.title;
    if (body.description !== undefined) document.description = body.description;
    if (body.notes !== undefined) document.notes = body.notes;
    if (body.tags !== undefined) document.tags = body.tags;
    if (body.category !== undefined) document.category = body.category;
    if (body.isFavorite !== undefined) document.isFavorite = body.isFavorite;
    if (body.lastModifiedBy) document.lastModifiedBy = body.lastModifiedBy;

    document.updatedAt = new Date();
    await document.save();

    return NextResponse.json({ document }, { status: 200 });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ message: 'Failed to update document' }, { status: 500 });
  }
}

// DELETE - Soft delete document
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const permanent = searchParams.get('permanent') === 'true';
    const deletedBy = searchParams.get('deletedBy');
    
    const document = await ProjectDocument.findById(id);
    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    if (permanent) {
      // Permanent delete - also delete from Cloudinary
      const publicId = document.fileUrl.split('/').pop()?.split('.')[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`project-docs/${document.projectId}/${publicId}`);
      }
      await ProjectDocument.findByIdAndDelete(id);
    } else {
      // Soft delete
      document.isDeleted = true;
      document.deletedAt = new Date();
      document.deletedBy = deletedBy || '';
      await document.save();
    }

    return NextResponse.json({ message: 'Document deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ message: 'Failed to delete document' }, { status: 500 });
  }
}
