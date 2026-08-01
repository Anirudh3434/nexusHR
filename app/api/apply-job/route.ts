import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import connectDB from '@/lib/mongodb';
import JobApplication from '@/models/JobApplication';
import JobPosition from '@/models/JobPosition';
import Company from '@/models/Company';

// Upload a file to Cloudinary and return its URL + metadata (mirrors /api/upload).
async function uploadFile(file: File, folder: string): Promise<{ url: string; filename: string; mimeType: string; size: number } | null> {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dhgqr0et2';
    const apiKey = process.env.CLOUDINARY_API_KEY || '146475928654719';
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) return null;

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder, resource_type: 'auto' }, (error, res) => {
        if (error) reject(error);
        else resolve(res);
      }).end(buffer);
    });

    return {
      url: result.secure_url || result.url,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    };
  } catch (error) {
    console.error('Resume upload failed:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const formData = await req.formData();
    
    // Extract form fields
    const companyId = formData.get('companyId') as string;
    const jobPositionId = formData.get('jobPositionId') as string;
    const candidateName = formData.get('candidateName') as string;
    const fromEmail = formData.get('fromEmail') as string;
    const candidatePhone = formData.get('candidatePhone') as string;
    const experience = formData.get('experience') as string;
    const currentDesignation = formData.get('currentDesignation') as string;
    const expectedSalary = formData.get('expectedSalary') as string;
    const noticePeriod = formData.get('noticePeriod') as string;
    const skills = formData.get('skills') as string;
    const coverLetter = formData.get('coverLetter') as string;
    const appliedPosition = formData.get('appliedPosition') as string;
    const resume = formData.get('resume') as File;

    // Validate required fields
    if (!companyId || !candidateName || !fromEmail || !experience) {
      return NextResponse.json(
        { message: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // Find company by slug or ID
    let company;
    if (companyId.length === 24) {
      company = await Company.findById(companyId);
    }
    if (!company) {
      company = await Company.findOne({ slug: companyId });
    }
    
    if (!company) {
      return NextResponse.json(
        { message: 'Company not found' }, 
        { status: 404 }
      );
    }

    // Fetch job position to get jobId
    let jobId = '';
    if (jobPositionId) {
      const jobPosition = await JobPosition.findById(jobPositionId);
      if (jobPosition) {
        jobId = jobPosition.jobId;
      }
    }

    // Upload resume file to Cloudinary (best-effort; store metadata on success)
    let attachments = [];
    if (resume && resume.size > 0) {
      const uploaded = await uploadFile(resume, `hrm/resumes/${company._id}`);
      if (uploaded) {
        attachments.push({
          filename: uploaded.filename,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
          fileUrl: uploaded.url,
        });
      }
    }

    // Create job application
    const application = await JobApplication.create({
      companyId: company._id,
      jobPositionId: jobPositionId || null,
      jobId,
      emailMessageId: `website_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromEmail,
      fromName: candidateName,
      subject: `Application for ${appliedPosition}`,
      body: coverLetter || '',
      bodyText: coverLetter || '',
      candidateName,
      candidatePhone,
      experience,
      currentDesignation,
      expectedSalary,
      noticePeriod,
      skills: skills ? skills.split(',').map((s: string) => s.trim()) : [],
      appliedPosition,
      hasAttachments: attachments.length > 0,
      attachments,
      source: 'website',
      status: 'new',
      isRead: false,
      receivedAt: new Date(),
    });

    return NextResponse.json(
      { message: 'Application submitted successfully', application }, 
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Apply job error:', error);
    return NextResponse.json(
      { message: 'Error submitting application', error: error.message }, 
      { status: 500 }
    );
  }
}
