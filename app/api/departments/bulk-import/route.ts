import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Department from '@/models/Department';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';

const WRITE_ROLES = ['super_admin', 'admin', 'hr'];

export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!hasRole(auth.role, WRITE_ROLES)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const isSuperAdmin = auth.role === 'super_admin';
    const companyId = isSuperAdmin ? (body.companyId || auth.companyId) : auth.companyId;

    if (!companyId) {
      return NextResponse.json({ message: 'Company scope required' }, { status: 400 });
    }

    const { departments } = body;
    if (!Array.isArray(departments) || departments.length === 0) {
      return NextResponse.json({ message: 'No departments provided' }, { status: 400 });
    }

    // Fetch existing departments for this company to prevent duplicate names
    const existing = await Department.find({ companyId, isActive: true }).select('name');
    const existingNames = new Set(existing.map((d: any) => d.name.trim().toLowerCase()));

    const toInsert: any[] = [];
    const errors: Array<{ row: number; name: string; reason: string }> = [];
    let skippedCount = 0;

    departments.forEach((dept, index) => {
      const rowNum = index + 1;
      const rawName = (dept.name || '').trim();
      const description = (dept.description || '').trim();

      if (!rawName) {
        errors.push({ row: rowNum, name: '', reason: 'Department name is missing' });
        return;
      }

      const lowerName = rawName.toLowerCase();
      if (existingNames.has(lowerName)) {
        skippedCount++;
        errors.push({ row: rowNum, name: rawName, reason: 'Department already exists' });
        return;
      }

      // Track within batch to avoid duplicate entries in the same import file
      existingNames.add(lowerName);
      toInsert.push({
        companyId,
        name: rawName,
        description,
        isActive: true,
      });
    });

    let inserted: any[] = [];
    if (toInsert.length > 0) {
      inserted = await Department.insertMany(toInsert);
    }

    return NextResponse.json({
      message: `Imported ${inserted.length} departments successfully`,
      total: departments.length,
      importedCount: inserted.length,
      skippedCount,
      errors,
      inserted,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error during bulk department import:', error);
    return NextResponse.json({ message: 'Bulk import failed', error: error.message }, { status: 500 });
  }
}
