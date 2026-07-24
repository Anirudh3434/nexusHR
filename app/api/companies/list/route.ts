import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';

export async function GET() {
  try {
    await connectDB();
    
    const companies = await Company.find({})
      .select('name code email phone gstNumber panNumber onboardingComplete isActive createdAt')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({
      count: companies.length,
      companies: companies.map(c => ({
        id: c._id.toString(),
        name: c.name,
        code: c.code,
        email: c.email,
        phone: c.phone,
        gstNumber: c.gstNumber,
        panNumber: c.panNumber,
        onboardingComplete: c.onboardingComplete,
        isActive: c.isActive,
        createdAt: c.createdAt,
      }))
    });
    
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { message: 'Error fetching companies', error: error.message },
      { status: 500 }
    );
  }
}
