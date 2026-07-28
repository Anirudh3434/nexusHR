import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ReportTemplate from '@/models/ReportTemplate';
import { headers } from 'next/headers';

// GET - Fetch report templates
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const userId = headersList.get('x-user-id');

    if (!companyId || !userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const isTemplate = searchParams.get('isTemplate');
    const isPublic = searchParams.get('isPublic');

    // Build query
    const query: any = { companyId };
    
    if (category) {
      query.category = category;
    }
    
    if (isTemplate !== null) {
      query.isTemplate = isTemplate === 'true';
    }

    if (isPublic !== null) {
      query.isPublic = isPublic === 'true';
    }

    // Fetch templates created by user or shared with user
    const templates = await ReportTemplate.find({
      $or: [
        query,
        { createdBy: userId, companyId },
        { sharedWith: userId, companyId },
        { isPublic: true, companyId }
      ]
    })
    .populate('createdBy', 'name email')
    .populate('sharedWith', 'name email')
    .sort({ createdAt: -1 })
    .lean();

    return NextResponse.json({ templates }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching report templates:', error);
    return NextResponse.json({ message: 'Error fetching templates', error: error.message }, { status: 500 });
  }
}

// POST - Create new report template
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const userId = headersList.get('x-user-id');

    if (!companyId || !userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, category, layout, parameters, isTemplate, isPublic, sharedWith } = body;

    if (!name || !category || !layout) {
      return NextResponse.json({ message: 'Name, category, and layout are required' }, { status: 400 });
    }

    const template = await ReportTemplate.create({
      companyId,
      name,
      description,
      createdBy: userId,
      category,
      layout,
      parameters: parameters || [],
      isTemplate: isTemplate || false,
      isPublic: isPublic || false,
      sharedWith: sharedWith || [],
    });

    return NextResponse.json({ template }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating report template:', error);
    return NextResponse.json({ message: 'Error creating template', error: error.message }, { status: 500 });
  }
}
