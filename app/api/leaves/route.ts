import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Leave from '@/models/Leave';
import { getAuthInfo } from '@/lib/auth-util';
import { hasRole } from '@/lib/auth';
import { notify } from '@/lib/notify';
import { getManagerChainIds, getSubordinateIds, isInReportingChain } from '@/lib/hierarchy-query';

const shortDate = (value: Date | string) =>
  new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

// GET leave requests
export async function GET(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const isSuperAdmin = auth.role === 'super_admin';
    const isEmployee = auth.role === 'employee';
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const queryCompanyId = searchParams.get('companyId');

    if (queryCompanyId && !isSuperAdmin && queryCompanyId !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }

    let query: any = {};
    // Tenant scope: always from session (super_admin may optionally filter)
    if (isSuperAdmin) {
      if (queryCompanyId) query.companyId = queryCompanyId;
      else if (auth.companyId) query.companyId = auth.companyId;
    } else {
      if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
      query.companyId = auth.companyId;
    }
    if (status) query.status = status;
    if (isEmployee) {
      // Employees see only their own leaves; ignore employeeId param
      query.employeeId = auth.userId;
    } else if (auth.role === 'manager' && !isSuperAdmin) {
      // Managers see only their own reporting hierarchy (plus their own records).
      const teamIds = await getSubordinateIds(auth.userId, auth.companyId);
      const visibleIds = [...teamIds, auth.userId];
      if (employeeId && !visibleIds.includes(employeeId)) {
        return NextResponse.json(
          { message: 'Forbidden: employee is outside your reporting hierarchy' },
          { status: 403 }
        );
      }
      query.employeeId = employeeId ? employeeId : { $in: visibleIds };
    } else if (employeeId) {
      query.employeeId = employeeId;
    }

    const leaves = await Leave.find(query)
      .populate('employeeId', 'name department')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const formattedLeaves = leaves.map((leave: any) => ({
      ...leave,
      id: leave._id.toString(),
      _id: undefined,
      employeeName: (leave.employeeId as any)?.name,
      department: (leave.employeeId as any)?.department,
    }));

    return NextResponse.json(formattedLeaves);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching leaves', error: error.message }, { status: 500 });
  }
}

// POST create leave request
export async function POST(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (!auth.companyId) return NextResponse.json({ message: 'Company scope required' }, { status: 403 });
    const data = await req.json();

    // employeeId + companyId always from session; ignore body values
    const employeeId = auth.userId;
    const companyId = auth.companyId;
    const { type, startDate, endDate, totalDays, reason } = data;

    if (!type || !startDate || !endDate) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const newLeave = await Leave.create({
      employeeId,
      companyId,
      type,
      startDate,
      endDate,
      totalDays,
      reason,
      status: 'Pending',
    });

    // Notify only the requester's management chain (plus HR/admin), never
    // unrelated managers in the company.
    const managerIds = await getManagerChainIds(employeeId);
    await notify({
      companyId,
      kind: 'leave',
      title: '{actor} requested leave',
      message: `${type} · ${shortDate(startDate)} → ${shortDate(endDate)} · ${totalDays || 1} ${
        totalDays === 1 ? 'day' : 'days'
      }.`,
      href: '/leave-approvals',
      meta: 'Awaiting approval',
      actorId: employeeId,
      dedupeKey: `leave:${newLeave._id}`,
      recipientIds: managerIds,
      roles: ['admin', 'hr'],
    });

    return NextResponse.json({
      message: 'Leave request created successfully',
      id: newLeave._id,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error creating leave request', error: error.message }, { status: 500 });
  }
}

// PATCH update leave status
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const data = await req.json();

    // approvedBy always from session; ignore body value
    const { id, status, comment } = data;

    if (!id || !status) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const existing = await Leave.findById(id);
    if (!existing) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 });
    }
    // Same-company check (super_admin bypasses)
    if (auth.role !== 'super_admin' && existing.companyId?.toString() !== auth.companyId) {
      return NextResponse.json({ message: 'Forbidden: company mismatch' }, { status: 403 });
    }
    // Only Pending requests can transition
    if (existing.status !== 'Pending') {
      return NextResponse.json({ message: `Cannot update leave with status ${existing.status}` }, { status: 400 });
    }
    if (!['Approved', 'Rejected', 'Cancelled'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status transition' }, { status: 400 });
    }

    // --- Authorization -----------------------------------------------------
    // Withdrawal (Cancelled): only the requester may withdraw their own
    // leave, and only while it is still Pending. Privileged roles may cancel.
    // Approval/Rejection: only the requester's reporting chain (or admin/HR).
    const isOwner = String(existing.employeeId) === auth.userId;
    const isPrivileged = hasRole(auth.role, ['super_admin', 'admin', 'hr']);

    if (status === 'Cancelled') {
      if (!isOwner && !isPrivileged) {
        return NextResponse.json(
          { message: 'Only the requester can withdraw this leave request' },
          { status: 403 }
        );
      }
    } else {
      if (isOwner) {
        return NextResponse.json(
          { message: 'You cannot approve or reject your own leave request' },
          { status: 403 }
        );
      }
      if (!isPrivileged) {
        if (auth.role !== 'manager') {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        const canApprove = await isInReportingChain(auth.userId, String(existing.employeeId));
        if (!canApprove) {
          return NextResponse.json(
            { message: 'Only the reporting manager of this employee can act on the request' },
            { status: 403 }
          );
        }
      }
    }

    // Attribute the decision to the approver; an owner withdrawal is not an approval.
    const update: Record<string, unknown> = { status };
    if (!(status === 'Cancelled' && isOwner)) update.approvedBy = auth.userId;
    if (comment !== undefined) update.comment = comment;

    const leave = await Leave.findByIdAndUpdate(id, update, { new: true });

    if (!leave) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 });
    }

    if (status === 'Cancelled' && isOwner) {
      // Let the approvers know the request no longer needs action.
      const managerIds = await getManagerChainIds(String(existing.employeeId));
      await notify({
        companyId: existing.companyId.toString(),
        kind: 'leave',
        title: '{actor} withdrew a leave request',
        message: `${existing.type} · ${shortDate(existing.startDate)} → ${shortDate(existing.endDate)}.`,
        href: '/leave-approvals',
        meta: 'Withdrawn',
        actorId: auth.userId,
        recipientIds: managerIds,
        roles: ['admin', 'hr'],
        dedupeKey: `leave-withdraw:${leave._id}`,
      });
    } else {
      // Tell the requester the decision.
      await notify({
        companyId: existing.companyId.toString(),
        kind: 'leave',
        title: `Leave ${status.toLowerCase()}`,
        message: `${existing.type} · ${shortDate(existing.startDate)} → ${shortDate(existing.endDate)}${
          comment ? ` · ${comment}` : ''
        }`,
        href: '/my-leaves',
        meta: status,
        recipientIds: [String(existing.employeeId)],
        actorId: auth.userId,
        dedupeKey: `leave-status:${leave._id}:${status}`,
      });
    }

    return NextResponse.json({
      message: 'Leave request updated successfully',
      leave,
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error updating leave request', error: error.message }, { status: 500 });
  }
}
