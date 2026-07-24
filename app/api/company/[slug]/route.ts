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
    
    // Find company by code OR name (case-insensitive)
    const searchSlug = slug.toUpperCase();
    const company = await Company.findOne({
      $or: [
        { code: searchSlug },
        { name: { $regex: new RegExp(`^${slug}$`, 'i') } }
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
    
    return NextResponse.json({
      exists: true,
      company: {
        id: company._id.toString(),
        name: company.name,
        code: company.code,
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
