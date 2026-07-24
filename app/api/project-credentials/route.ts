import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ProjectCredential, { encrypt, decrypt } from '@/models/ProjectCredential';

// GET - Fetch all credentials for a project
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const environment = searchParams.get('environment');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags');
    const isFavorite = searchParams.get('isFavorite');
    
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    const query: any = { projectId };
    
    if (environment) query.environment = environment;
    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };
    if (isFavorite === 'true') query.isFavorite = true;

    const credentials = await ProjectCredential.find(query)
      .sort({ isFavorite: -1, updatedAt: -1 });

    // Decrypt passwords for display (masked)
    const decryptedCredentials = credentials.map(cred => ({
      ...cred.toObject(),
      password: cred.encryptedPassword ? '••••••••' : undefined,
      otpSecret: cred.encryptedOtpSecret ? '••••••••' : undefined,
      apiKey: cred.encryptedApiKey ? '••••••••' : undefined,
      secretKey: cred.encryptedSecretKey ? '••••••••' : undefined,
      accessToken: cred.encryptedAccessToken ? '••••••••' : undefined
    }));

    return NextResponse.json({ credentials: decryptedCredentials }, { status: 200 });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json({ message: 'Failed to fetch credentials' }, { status: 500 });
  }
}

// POST - Create a new credential
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { 
      projectId, service, environment, category, loginUrl, username, email, 
      password, otpSecret, recoveryEmail, recoveryPhone, apiKey, secretKey, 
      accessToken, notes, tags, isFavorite, expiryDate, userId, userName, userEmail 
    } = body;

    if (!projectId || !service || !environment) {
      return NextResponse.json({ message: 'Project ID, service, and environment are required' }, { status: 400 });
    }

    const credential = await ProjectCredential.create({
      projectId,
      service,
      environment,
      category: category || 'Other',
      loginUrl,
      username,
      email,
      encryptedPassword: password ? encrypt(password) : undefined,
      encryptedOtpSecret: otpSecret ? encrypt(otpSecret) : undefined,
      recoveryEmail,
      recoveryPhone,
      encryptedApiKey: apiKey ? encrypt(apiKey) : undefined,
      encryptedSecretKey: secretKey ? encrypt(secretKey) : undefined,
      encryptedAccessToken: accessToken ? encrypt(accessToken) : undefined,
      encryptedNotes: notes ? encrypt(notes) : undefined,
      tags: tags || [],
      isFavorite: isFavorite || false,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      versions: [{
        version: 1,
        encryptedData: {
          username,
          password: password ? encrypt(password) : undefined,
          apiKey: apiKey ? encrypt(apiKey) : undefined,
          secretKey: secretKey ? encrypt(secretKey) : undefined,
          accessToken: accessToken ? encrypt(accessToken) : undefined,
          notes: notes ? encrypt(notes) : undefined
        },
        updatedBy: { _id: userId, name: userName, email: userEmail },
        updatedAt: new Date()
      }],
      createdBy: { _id: userId, name: userName, email: userEmail },
      lastUpdatedBy: { _id: userId, name: userName, email: userEmail }
    });

    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    console.error('Error creating credential:', error);
    return NextResponse.json({ message: 'Failed to create credential' }, { status: 500 });
  }
}
