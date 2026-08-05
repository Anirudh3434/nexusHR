import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CompanyContentConfig, { EMAIL_TEMPLATE_KEYS } from '@/models/CompanyContentConfig';
import { headers } from 'next/headers';

// GET - fetch content config for a company (email template overrides + careers)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
    }

    const config = await CompanyContentConfig.findOne({ companyId }).lean();

    return NextResponse.json({
      config: config
        ? {
            emailTemplates: config.emailTemplates || {},
            careers: config.careers || {},
          }
        : { emailTemplates: {}, careers: {} },
    });
  } catch (error: any) {
    console.error('Error fetching content config:', error);
    return NextResponse.json({ message: 'Error fetching content config', error: error.message }, { status: 500 });
  }
}

// PUT - save content config for a company
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { companyId, emailTemplates, careers } = body;

    if (!companyId) {
      return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
    }

    const sanitizedTemplates: Record<string, any> = {};
    if (emailTemplates && typeof emailTemplates === 'object') {
      for (const key of EMAIL_TEMPLATE_KEYS) {
        const t = emailTemplates[key];
        if (t && typeof t === 'object') {
          sanitizedTemplates[key] = {
            subject: typeof t.subject === 'string' ? t.subject : '',
            intro: typeof t.intro === 'string' ? t.intro : '',
            body: typeof t.body === 'string' ? t.body : '',
            closing: typeof t.closing === 'string' ? t.closing : '',
            html: typeof t.html === 'string' ? t.html : '',
          };
        }
      }
    }

    const sanitizedCareers: Record<string, string> = {};
    const careerFields = [
      'brandText', 'heroTitle', 'heroSubtitle', 'openPositionsTitle', 'openPositionsSubtitle',
      'howToApplyTitle', 'applyOnlineTitle', 'applyOnlineDesc', 'applyEmailTitle', 'applyEmailDesc', 'footerBrandText',
      'primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor', 'textColor', 'headerColor', 'buttonColor',
      'customHtml', 'customCss',
    ];
    if (careers && typeof careers === 'object') {
      for (const field of careerFields) {
        sanitizedCareers[field] = typeof careers[field] === 'string' ? careers[field] : '';
      }
    }

    const config = await CompanyContentConfig.findOneAndUpdate(
      { companyId },
      {
        $set: {
          emailTemplates: sanitizedTemplates,
          careers: sanitizedCareers,
          updatedBy: userId,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: 'Content configuration saved successfully',
      config: {
        emailTemplates: config.emailTemplates,
        careers: config.careers,
      },
    });
  } catch (error: any) {
    console.error('Error saving content config:', error);
    return NextResponse.json({ message: 'Error saving content config', error: error.message }, { status: 500 });
  }
}
