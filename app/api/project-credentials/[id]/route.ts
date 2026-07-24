import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectCredential, { encrypt, decrypt } from '@/models/ProjectCredential';

// PATCH - Update credential
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const body = await req.json();
    
    const credential = await ProjectCredential.findById(id);
    if (!credential) {
      return NextResponse.json({ message: 'Credential not found' }, { status: 404 });
    }

    // Track version if sensitive data changed
    const sensitiveFields = ['password', 'apiKey', 'secretKey', 'accessToken', 'notes'];
    const hasSensitiveChanges = sensitiveFields.some(field => body[field] !== undefined);

    if (hasSensitiveChanges) {
      const newVersion = credential.versions.length + 1;
      credential.versions.push({
        version: newVersion,
        encryptedData: {
          username: body.username,
          password: body.password ? encrypt(body.password) : undefined,
          apiKey: body.apiKey ? encrypt(body.apiKey) : undefined,
          secretKey: body.secretKey ? encrypt(body.secretKey) : undefined,
          accessToken: body.accessToken ? encrypt(body.accessToken) : undefined,
          notes: body.notes ? encrypt(body.notes) : undefined
        },
        updatedBy: body.lastUpdatedBy,
        updatedAt: new Date(),
        changeNotes: body.changeNotes
      });
    }

    // Update fields
    if (body.service !== undefined) credential.service = body.service;
    if (body.environment !== undefined) credential.environment = body.environment;
    if (body.category !== undefined) credential.category = body.category;
    if (body.loginUrl !== undefined) credential.loginUrl = body.loginUrl;
    if (body.username !== undefined) credential.username = body.username;
    if (body.email !== undefined) credential.email = body.email;
    if (body.password !== undefined) credential.encryptedPassword = encrypt(body.password);
    if (body.otpSecret !== undefined) credential.encryptedOtpSecret = encrypt(body.otpSecret);
    if (body.recoveryEmail !== undefined) credential.recoveryEmail = body.recoveryEmail;
    if (body.recoveryPhone !== undefined) credential.recoveryPhone = body.recoveryPhone;
    if (body.apiKey !== undefined) credential.encryptedApiKey = encrypt(body.apiKey);
    if (body.secretKey !== undefined) credential.encryptedSecretKey = encrypt(body.secretKey);
    if (body.accessToken !== undefined) credential.encryptedAccessToken = encrypt(body.accessToken);
    if (body.notes !== undefined) credential.encryptedNotes = encrypt(body.notes);
    if (body.tags !== undefined) credential.tags = body.tags;
    if (body.isFavorite !== undefined) credential.isFavorite = body.isFavorite;
    if (body.expiryDate !== undefined) credential.expiryDate = new Date(body.expiryDate);
    if (body.lastUpdatedBy) credential.lastUpdatedBy = body.lastUpdatedBy;

    credential.updatedAt = new Date();
    await credential.save();

    return NextResponse.json({ credential }, { status: 200 });
  } catch (error) {
    console.error('Error updating credential:', error);
    return NextResponse.json({ message: 'Failed to update credential' }, { status: 500 });
  }
}

// DELETE - Delete credential
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    const credential = await ProjectCredential.findByIdAndDelete(id);
    if (!credential) {
      return NextResponse.json({ message: 'Credential not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Credential deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting credential:', error);
    return NextResponse.json({ message: 'Failed to delete credential' }, { status: 500 });
  }
}
