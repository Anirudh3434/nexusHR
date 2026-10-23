import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import connectDB from '@/lib/mongodb';
import JobApplication from '@/models/JobApplication';
import JobPosition from '@/models/JobPosition';
import Company from '@/models/Company';

const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10MB public-upload cap

// Magic-byte signatures (do NOT trust client mimeType):
// %PDF = 25 50 44 46 ; ZIP-based Office docs (docx) = 50 4B (PK)
function sniffResumeType(buffer: Buffer): { mimeType: string; ext: string } | null {
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { mimeType: 'application/pdf', ext: 'pdf' };
  }
  if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    // ZIP container — accept as docx (legacy .doc OLE uploads are rejected)
    return { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' };
  }
  return null;
}

function sanitizeFilename(name: string, ext: string): string {
  const base = (name || 'resume').split('/').pop()?.split('\\').pop() || 'resume';
  const withoutExt = base.replace(/\.[^.]*$/, '');
  const clean = withoutExt.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'resume';
  return `${clean}.${ext}`;
}

// Upload a file to Cloudinary and return its URL + metadata (mirrors /api/upload).
async function uploadFile(file: File, folder: string): Promise<{ url: string; filename: string; mimeType: string; size: number } | null> {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dhgqr0et2';
    const apiKey = process.env.CLOUDINARY_API_KEY || '146475928654719';
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) return null;

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    if (file.size > MAX_RESUME_SIZE) return null;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (buffer.length > MAX_RESUME_SIZE) return null;

    const sniffed = sniffResumeType(buffer);
    if (!sniffed) return null;

    const safeName = sanitizeFilename(file.name, sniffed.ext);

    const result: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder, resource_type: 'auto', filename_override: safeName, use_filename: true, unique_filename: true }, (error, res) => {
        if (error) reject(error);
        else resolve(res);
      }).end(buffer);
    });

    return {
      url: result.secure_url || result.url,
      filename: safeName,
      mimeType: sniffed.mimeType,
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

    // Upload resume file to Cloudinary (best-effort; store metadata on success).
    // Public endpoint: 10MB cap + pdf/doc/docx allowlist enforced via magic bytes.
    let attachments = [];
    if (resume && resume.size > 0) {
      if (resume.size > MAX_RESUME_SIZE) {
        return NextResponse.json(
          { message: 'Resume exceeds the 10MB limit' },
          { status: 413 }
        );
      }
      const uploaded = await uploadFile(resume, `hrm/resumes/${company._id}`);
      if (uploaded) {
        attachments.push({
          filename: uploaded.filename,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
          fileUrl: uploaded.url,
        });
      } else if (resume.size > 0) {
        return NextResponse.json(
          { message: 'Resume must be a PDF, DOC, or DOCX file' },
          { status: 415 }
        );
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
