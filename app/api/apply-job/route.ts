import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import JobApplication from '@/models/JobApplication';
import JobPosition from '@/models/JobPosition';
import Company from '@/models/Company';

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

    // Process resume file
    let attachments = [];
    if (resume) {
      const bytes = await resume.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Store file info (in production, upload to S3/cloud storage)
      attachments.push({
        filename: resume.name,
        mimeType: resume.type,
        size: resume.size,
        fileUrl: `uploads/${Date.now()}_${resume.name}`, // Placeholder
      });
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
