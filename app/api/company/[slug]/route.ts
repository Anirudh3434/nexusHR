import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    
    const { slug } = await params;
    
    // Find company by code OR name / slug (case-insensitive & hyphen-friendly)
    const decodedSlug = decodeURIComponent(slug).trim();
    const searchCode = decodedSlug.toUpperCase();
    const nameRegexPattern = decodedSlug.replace(/[-_]/g, '[\\s-_]?');

    const company = await Company.findOne({
      $or: [
        { code: searchCode },
        { name: { $regex: new RegExp(`^${nameRegexPattern}$`, 'i') } },
        { name: { $regex: new RegExp(`^${decodedSlug}$`, 'i') } }
      ],
      isActive: true,
      onboardingComplete: true
    }).select('-__v');
    
    if (!company) {
      return NextResponse.json(
        { message: 'Company not found', exists: false },
        { status: 404 }
      );
    }

    const companyNameSlug = company.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || company.code.toLowerCase();
    
    return NextResponse.json({
      exists: true,
      company: {
        id: company._id.toString(),
        name: company.name,
        code: company.code,
        slug: companyNameSlug,
        logo: company.logo,
        email: company.email,
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { message: 'Error fetching company', error: error.message },
      { status: 500 }
    );
  }
}
