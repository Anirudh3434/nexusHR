import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import mongoose from 'mongoose';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { inferHierarchyLevel, HIERARCHY_MAP, type HierarchyLevel } from '@/lib/hierarchy';
import { notify } from '@/lib/notify';

interface EmployeeNode {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  avatar: string | null;
  phone: string | null;
  employeeId: string | null;
  reportsToId: string | null;
  reportsTo: {
    id: string;
    name: string;
    designation: string;
    avatar: string | null;
    hierarchyLevel: HierarchyLevel;
  } | null;
  hierarchyLevel: HierarchyLevel;
  directReportsCount: number;
}

export interface HierarchyTreeNode extends EmployeeNode {
  children: HierarchyTreeNode[];
}

/**
 * Cycle detection: walks up reportsTo chain to prevent loops (e.g. A -> B -> A).
 */
async function wouldCreateCycle(employeeId: string, candidateManagerId: string): Promise<boolean> {
  let currentId: string | null = candidateManagerId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === employeeId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const parent: any = await User.findById(currentId).select('reportsTo').lean();
    currentId = parent?.reportsTo ? String(parent.reportsTo) : null;
  }

  return false;
}

// GET org hierarchy & reporting matrix
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get('companyId');

    if (queryCompanyId && auth.role !== 'super_admin' && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    const companyId = auth.role === 'super_admin' ? (queryCompanyId || auth.companyId) : auth.companyId;
    if (!companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });

    // Fetch active company users
    const users = await User.find({ companyId, isActive: { $ne: false } })
      .select('name email role department designation avatar reportsTo hierarchyLevel phone employeeId')
      .lean();

    // Map each user to base record
    const employeeMap = new Map<string, EmployeeNode>();
    const reportCountMap = new Map<string, number>();

    // Initial pass: infer levels and record IDs
    for (const u of users as any[]) {
      const id = String(u._id);
      const level: HierarchyLevel = u.hierarchyLevel || inferHierarchyLevel(u.role, u.designation);
      const reportsToId = u.reportsTo ? String(u.reportsTo) : null;

      if (reportsToId) {
        reportCountMap.set(reportsToId, (reportCountMap.get(reportsToId) || 0) + 1);
      }

      employeeMap.set(id, {
        id,
        name: u.name || 'Unknown',
        email: u.email || '',
        role: u.role || 'employee',
        department: u.department || 'General',
        designation: u.designation || (u.role === 'admin' ? 'Administrator' : u.role || 'Team Member'),
        avatar: u.avatar || null,
        phone: u.phone || null,
        employeeId: u.employeeId || null,
        reportsToId,
        reportsTo: null,
        hierarchyLevel: level,
        directReportsCount: 0,
      });
    }

    // Second pass: attach directReportsCount and manager summary
    const employees: EmployeeNode[] = [];
    for (const [id, emp] of employeeMap.entries()) {
      emp.directReportsCount = reportCountMap.get(id) || 0;

      if (emp.reportsToId && employeeMap.has(emp.reportsToId)) {
        const mgr = employeeMap.get(emp.reportsToId)!;
        emp.reportsTo = {
          id: mgr.id,
          name: mgr.name,
          designation: mgr.designation,
          avatar: mgr.avatar,
          hierarchyLevel: mgr.hierarchyLevel,
        };
      }

      employees.push(emp);
    }

    // Sort employees by hierarchy tier order, then name
    employees.sort((a, b) => {
      const orderA = HIERARCHY_MAP.get(a.hierarchyLevel)?.order || 99;
      const orderB = HIERARCHY_MAP.get(b.hierarchyLevel)?.order || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    // Build hierarchical tree
    const treeNodeMap = new Map<string, HierarchyTreeNode>();
    employees.forEach((emp) => {
      treeNodeMap.set(emp.id, { ...emp, children: [] });
    });

    const rootNodes: HierarchyTreeNode[] = [];

    treeNodeMap.forEach((node) => {
      if (node.reportsToId && treeNodeMap.has(node.reportsToId) && node.reportsToId !== node.id) {
        const parent = treeNodeMap.get(node.reportsToId)!;
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Sort children within each branch
    const sortBranch = (nodes: HierarchyTreeNode[]) => {
      nodes.sort((a, b) => {
        const orderA = HIERARCHY_MAP.get(a.hierarchyLevel)?.order || 99;
        const orderB = HIERARCHY_MAP.get(b.hierarchyLevel)?.order || 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((n) => sortBranch(n.children));
    };
    sortBranch(rootNodes);

    // Compute stats
    const stats = {
      total: employees.length,
      directors: employees.filter((e) => e.hierarchyLevel === 'director').length,
      managers: employees.filter((e) => e.hierarchyLevel === 'manager').length,
      leads: employees.filter((e) => e.hierarchyLevel === 'lead').length,
      seniors: employees.filter((e) => e.hierarchyLevel === 'senior').length,
      juniors: employees.filter((e) => e.hierarchyLevel === 'junior').length,
      interns: employees.filter((e) => e.hierarchyLevel === 'intern').length,
      hr: employees.filter((e) => e.hierarchyLevel === 'hr').length,
      unassignedManagerCount: employees.filter(
        (e) => !e.reportsToId && e.hierarchyLevel !== 'director'
      ).length,
    };

    return NextResponse.json({
      employees,
      tree: rootNodes,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching hierarchy:', error);
    return NextResponse.json(
      { message: 'Error fetching hierarchy', error: error.message },
      { status: 500 }
    );
  }
}

// PATCH update reporting manager or hierarchy tier
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!hasRole(auth.role, ['super_admin', 'admin', 'hr', 'manager'])) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { employeeId, reportsTo, hierarchyLevel, designation } = body;

    if (!employeeId) {
      return NextResponse.json({ message: 'employeeId is required' }, { status: 400 });
    }

    // Verify employee belongs to same company
    const employee = await User.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    if (auth.role !== 'super_admin' && employee.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    // Validate reportsTo
    let normalizedReportsTo: mongoose.Types.ObjectId | null = null;
    if (reportsTo) {
      if (String(reportsTo) === String(employeeId)) {
        return NextResponse.json({ message: 'An employee cannot report to themselves' }, { status: 400 });
      }

      const manager = await User.findById(reportsTo);
      if (!manager) {
        return NextResponse.json({ message: 'Assigned manager not found' }, { status: 404 });
      }

      if (auth.role !== 'super_admin' && manager.companyId?.toString() !== auth.companyId) {
        return NextResponse.json({ message: 'Forbidden: manager company mismatch' }, { status: 403 });
      }

      // Check for cycles
      const hasCycle = await wouldCreateCycle(String(employeeId), String(reportsTo));
      if (hasCycle) {
        return NextResponse.json(
          { message: 'Circular reporting line detected. Cannot assign a subordinate as manager.' },
          { status: 400 }
        );
      }

      normalizedReportsTo = new mongoose.Types.ObjectId(reportsTo);
    }

    const updateData: any = {};
    if (reportsTo !== undefined) updateData.reportsTo = normalizedReportsTo;
    if (hierarchyLevel) updateData.hierarchyLevel = hierarchyLevel;
    if (designation !== undefined) updateData.designation = designation;

    const updatedUser = await User.findByIdAndUpdate(
      employeeId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    // Sync with Employee model if linked
    await Employee.findOneAndUpdate(
      { userId: employeeId },
      { $set: updateData }
    ).catch(() => {});

    // Notify employee of reporting update
    if (reportsTo) {
      const managerUser = await User.findById(reportsTo).select('name');
      await notify({
        companyId: String(employee.companyId),
        kind: 'system',
        title: 'Reporting line updated',
        message: `Your reporting manager is now ${managerUser?.name || 'updated'}.`,
        href: '/hierarchy',
        meta: 'Hierarchy',
        recipientIds: [String(employeeId)],
        actorId: auth.userId,
      });
    }

    return NextResponse.json({
      message: 'Hierarchy updated successfully',
      employee: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating hierarchy:', error);
    return NextResponse.json(
      { message: 'Error updating hierarchy', error: error.message },
      { status: 500 }
    );
  }
}
