import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Settings from '@/models/Settings';
import Company from '@/models/Company';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const ADMIN_ROLES = ['super_admin', 'admin'];

// GET settings for a company
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const companySlug = searchParams.get('slug');

    let query: any = {};
    if (companyId) query.companyId = companyId;
    
    // If no specific query, return first settings (for public login page)
    let settings;
    if (Object.keys(query).length === 0 && !companySlug) {
      settings = await Settings.findOne();
    } else {
      settings = await Settings.findOne(query);
    }

    if (!settings) {
      // Return default settings
      return NextResponse.json({
        logo: null,
        loginBackground: null,
        loginBackgroundColor: '#ffffff',
        primaryColor: '#2563eb',
        loginTitle: 'Welcome Back',
        loginSubtitle: 'Sign in to your account',
      });
    }

    return NextResponse.json({
      id: settings._id.toString(),
      companyId: settings.companyId?.toString(),
      logo: settings.logo,
      loginBackground: settings.loginBackground,
      loginBackgroundColor: settings.loginBackgroundColor,
      primaryColor: settings.primaryColor,
      loginTitle: settings.loginTitle,
      loginSubtitle: settings.loginSubtitle,
      updatedAt: settings.updatedAt,
    });
  } catch (error: any) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ message: 'Error fetching settings', error: error.message }, { status: 500 });
  }
}

// POST/PUT update settings
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, ADMIN_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    const isSuperAdmin = auth.role === 'super_admin';
    const data = await req.json();

    if (data.companyId && !isSuperAdmin && data.companyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    // Never trust body companyId: always from session (super_admin may pass any)
    const companyId = isSuperAdmin ? (data.companyId || auth.companyId) : auth.companyId;

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID required' }, { status: 400 });
    }

    const { logo, loginBackground, loginBackgroundColor, primaryColor, loginTitle, loginSubtitle } = data;
    const updatedBy = auth.userId;

    // Find and update or create new
    const settings = await Settings.findOneAndUpdate(
      { companyId },
      {
        companyId,
        logo,
        loginBackground,
        loginBackgroundColor,
        primaryColor,
        loginTitle,
        loginSubtitle,
        updatedBy,
      },
      { new: true, upsert: true }
    );

    if (logo !== undefined) {
      await Company.findByIdAndUpdate(companyId, { logo });
    }

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: {
        id: settings._id.toString(),
        logo: settings.logo,
        loginBackground: settings.loginBackground,
        loginBackgroundColor: settings.loginBackgroundColor,
        primaryColor: settings.primaryColor,
        loginTitle: settings.loginTitle,
        loginSubtitle: settings.loginSubtitle,
      }
    });
  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json({ message: 'Error updating settings', error: error.message }, { status: 500 });
  }
}
