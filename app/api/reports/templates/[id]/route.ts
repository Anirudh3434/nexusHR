import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ReportTemplate from '@/models/ReportTemplate';
import { headers } from 'next/headers';

// PUT - Update report template
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const userId = headersList.get('x-user-id');

    if (!companyId || !userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, category, layout, parameters, isTemplate, isPublic, sharedWith } = body;

    // Find the template and verify it belongs to the company
    const template = await ReportTemplate.findOne({ _id: id, companyId });

    if (!template) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    // Update fields
    if (name !== undefined) template.name = name;
    if (description !== undefined) template.description = description;
    if (category !== undefined) template.category = category;
    if (layout !== undefined) template.layout = layout;
    if (parameters !== undefined) template.parameters = parameters;
    if (isTemplate !== undefined) template.isTemplate = isTemplate;
    if (isPublic !== undefined) template.isPublic = isPublic;
    if (sharedWith !== undefined) template.sharedWith = sharedWith;

    await template.save();

    return NextResponse.json({ template }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating report template:', error);
    return NextResponse.json({ message: 'Error updating template', error: error.message }, { status: 500 });
  }
}

// DELETE - Delete report template
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const headersList = await headers();
    const companyId = headersList.get('x-company-id');
    const userId = headersList.get('x-user-id');

    if (!companyId || !userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find and verify the template belongs to the company and was created by the user
    const template = await ReportTemplate.findOneAndDelete({ 
      _id: id, 
      companyId,
      createdBy: userId
    });

    if (!template) {
      return NextResponse.json({ message: 'Template not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Template deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('Error deleting report template:', error);
    return NextResponse.json({ message: 'Error deleting template', error: error.message }, { status: 500 });
  }
}
