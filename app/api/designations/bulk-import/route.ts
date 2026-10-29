import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Designation from '@/models/Designation';
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

    const { designations } = body;
    if (!Array.isArray(designations) || designations.length === 0) {
      return NextResponse.json({ message: 'No designations provided' }, { status: 400 });
    }

    // Fetch existing designations for this company to prevent duplicate names under same dept
    const existing = await Designation.find({ companyId, isActive: true }).select('name department');
    const existingKeySet = new Set(
      existing.map((d: any) => `${(d.name || '').trim().toLowerCase()}_${(d.department || '').trim().toLowerCase()}`)
    );

    const toInsert: any[] = [];
    const errors: Array<{ row: number; name: string; reason: string }> = [];
    let skippedCount = 0;

    designations.forEach((desig, index) => {
      const rowNum = index + 1;
      const rawName = (desig.name || '').trim();
      const department = (desig.department || '').trim();
      const description = (desig.description || '').trim();

      if (!rawName) {
        errors.push({ row: rowNum, name: '', reason: 'Designation name is missing' });
        return;
      }

      const key = `${rawName.toLowerCase()}_${department.toLowerCase()}`;
      if (existingKeySet.has(key)) {
        skippedCount++;
        errors.push({
          row: rowNum,
          name: rawName,
          reason: department ? `Already exists under department "${department}"` : 'Designation already exists',
        });
        return;
      }

      existingKeySet.add(key);
      toInsert.push({
        companyId,
        name: rawName,
        department: department || undefined,
        description: description || undefined,
        isActive: true,
      });
    });

    let inserted: any[] = [];
    if (toInsert.length > 0) {
      inserted = await Designation.insertMany(toInsert);
    }

    return NextResponse.json({
      message: `Imported ${inserted.length} designations successfully`,
      total: designations.length,
      importedCount: inserted.length,
      skippedCount,
      errors,
      inserted,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error during bulk designation import:', error);
    return NextResponse.json({ message: 'Bulk import failed', error: error.message }, { status: 500 });
  }
}
