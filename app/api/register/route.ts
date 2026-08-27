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
    if (!name || !email || !phone) {
      return NextResponse.json(
        { message: 'Company name, email, and phone are required' },
        { status: 400 }
      );
    }
    
    if (!adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { message: 'Admin name, email, and password are required' },
        { status: 400 }
      );
    }

    // Function to generate a clean 6-character alphanumeric ID
    const generate6CharID = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let res = '';
      for (let i = 0; i < 6; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return res;
    };

    // Determine final 6-character company code
    let finalCode = (code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (finalCode.length !== 6) {
      finalCode = generate6CharID();
    }

    // Ensure company code is 100% unique in DB
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const existing = await Company.findOne({ code: finalCode });
      if (!existing) {
        isUnique = true;
      } else {
        finalCode = generate6CharID();
        attempts++;
      }
    }
    
    // Check if email already exists for another company
    const existingCompanyEmail = await Company.findOne({ email });
    if (existingCompanyEmail) {
      return NextResponse.json(
        { message: 'A company with this email address already exists' },
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
      code: finalCode,
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
