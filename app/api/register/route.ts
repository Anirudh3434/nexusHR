import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const body = await req.json();
    
    // Extract all the data from the request
    const {
      // Company Info
      name,
      code,
      email,
      phone,
      website,
      logo,
      
      // Address & Tax
      street,
      city,
      state,
      zipCode,
      country,
      gstNumber,
      panNumber,
      
      // Office Location
      officeLatitude,
      officeLongitude,
      officeAddress,
      geoFenceRadius,
      enableGeoFencing,
      
      // Admin Account
      adminName,
      adminEmail,
      adminPassword,
    } = body;
    
    // Validate required fields
    if (!name || !code || !email || !phone) {
      return NextResponse.json(
        { message: 'Company name, code, email, and phone are required' },
        { status: 400 }
      );
    }
    
    if (!adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { message: 'Admin name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Check if company code already exists
    const existingCompany = await Company.findOne({ 
      $or: [{ code }, { email }] 
    });
    
    if (existingCompany) {
      return NextResponse.json(
        { message: 'Company with this code or email already exists' },
        { status: 400 }
      );
    }
    
    // Check if admin email already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Admin email already registered' },
        { status: 400 }
      );
    }
    
    // Check GST number if provided
    if (gstNumber) {
      const existingGST = await Company.findOne({ gstNumber });
      if (existingGST) {
        return NextResponse.json(
          { message: 'GST number already registered' },
          { status: 400 }
        );
      }
    }
    
    // Create the company
    const company = await Company.create({
      name,
      code: code.toUpperCase(),
      email,
      phone,
      website,
      logo,
      address: {
        street,
        city,
        state,
        zipCode,
        country: country || 'India',
      },
      gstNumber: gstNumber ? gstNumber.toUpperCase() : undefined,
      panNumber: panNumber ? panNumber.toUpperCase() : undefined,
      officeLocation: {
        latitude: parseFloat(officeLatitude) || 0,
        longitude: parseFloat(officeLongitude) || 0,
        address: officeAddress,
      },
      geoFenceRadius: geoFenceRadius || 100,
      enableGeoFencing: enableGeoFencing !== false,
      onboardingComplete: true,
      registrationStep: 4,
      isActive: true,
    });
    
    // Hash admin password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Create the admin user
    const adminUser = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      companyId: company._id,
      isActive: true,
    });
    
    // Update company reference (optional - you could also create an Employee record here)
    // For now, we'll just keep the company and user linked via companyId
    
    return NextResponse.json(
      {
        message: 'Company registered successfully',
        company: {
          id: company._id.toString(),
          name: company.name,
          code: company.code,
          email: company.email,
        },
        admin: {
          id: adminUser._id.toString(),
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return NextResponse.json(
        { message: `${field} already exists` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Registration failed', error: error.message },
      { status: 500 }
    );
  }
}
