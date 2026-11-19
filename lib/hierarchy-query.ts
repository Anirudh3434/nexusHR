import User from '@/models/User';

/**
 * Tenant-safe reporting-hierarchy lookups (server only).
 *
 * The org chart is modelled by `User.reportsTo`. Approvals must follow that
 * chain: a manager only sees and acts on the people below them, and each
 * employee is notified up their own management chain — never to unrelated
 * managers in the company.
 */

const MAX_DEPTH = 25; // cycle guard

/** Every user id below `managerId` in the reporting tree (direct + indirect). */
export async function getSubordinateIds(
  managerId: string,
  companyId: string
): Promise<string[]> {
  const collected = new Set<string>();
  let frontier: string[] = [String(managerId)];

  for (let depth = 0; depth < MAX_DEPTH && frontier.length > 0; depth++) {
    const reports = await User.find({
      companyId,
      reportsTo: { $in: frontier },
    })
      .select('_id')
      .lean();

    const next: string[] = [];
    for (const report of reports) {
      const id = String(report._id);
      if (id === String(managerId) || collected.has(id)) continue;
      collected.add(id);
      next.push(id);
    }
    frontier = next;
  }

  return Array.from(collected);
}

/** Manager ids above `employeeId` (direct manager, their manager, ...). */
export async function getManagerChainIds(employeeId: string): Promise<string[]> {
  const chain: string[] = [];
  const seen = new Set<string>([String(employeeId)]);
  let current = String(employeeId);

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const employee = await User.findById(current).select('reportsTo').lean();
    const next = employee?.reportsTo ? String(employee.reportsTo) : '';
    if (!next || seen.has(next)) break;
    seen.add(next);
    chain.push(next);
    current = next;
  }

  return chain;
}

/** True when `managerId` is anywhere above `employeeId` in the reporting chain. */
export async function isInReportingChain(
  managerId: string,
  employeeId: string
): Promise<boolean> {
  if (!managerId || !employeeId) return false;
  if (String(managerId) === String(employeeId)) return false;
  const chain = await getManagerChainIds(employeeId);
  return chain.includes(String(managerId));
}
