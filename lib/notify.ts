import Notification, { type NotificationKind } from '@/models/Notification';
import User from '@/models/User';
import type { Role } from '@/lib/permissions';

export type { NotificationKind } from '@/models/Notification';

export interface NotifyInput {
  companyId?: string | null;
  kind: NotificationKind;
  title: string;
  message: string;
  href: string;
  meta?: string;
  actorId?: string | null;
  actorName?: string | null;
  /** Everyone in the company holding one of these roles receives a card. */
  roles?: Role[];
  /** Explicit recipients (task assignees, payroll employees, ...). */
  recipientIds?: (string | null | undefined)[];
  excludeIds?: (string | null | undefined)[];
  /** Same key + recipient is only ever stored once. */
  dedupeKey?: string;
}

/**
 * Fan-out helper used by the event handlers (leave, resignation, ticket, task,
 * payroll, expense, announcement). Role audiences are resolved here so the
 * caller only states intent. Never throws: a failed notification must not
 * break the action that triggered it.
 */
export async function notify(input: NotifyInput): Promise<number> {
  try {
    if (!input.companyId) return 0;

    const recipients = new Set<string>();
    for (const id of input.recipientIds || []) {
      if (id) recipients.add(String(id));
    }

    if (input.roles?.length) {
      const audience = await User.find({
        companyId: input.companyId,
        role: { $in: input.roles },
        isActive: true,
      })
        .select('_id')
        .lean();

      for (const user of audience) {
        recipients.add(String(user._id));
      }
    }

    if (input.actorId) recipients.delete(String(input.actorId));
    for (const id of input.excludeIds || []) {
      if (id) recipients.delete(String(id));
    }

    if (recipients.size === 0) return 0;

    let actorName = input.actorName || undefined;
    if (!actorName && input.actorId) {
      const actor = await User.findById(input.actorId).select('name').lean();
      actorName = actor?.name;
    }
    const actorLabel = actorName || 'A teammate';

    const docs = Array.from(recipients).map((recipientId) => ({
      companyId: input.companyId,
      recipientId,
      kind: input.kind,
      title: input.title.replace(/\{actor\}/g, actorLabel),
      message: input.message.replace(/\{actor\}/g, actorLabel),
      href: input.href,
      meta: input.meta,
      actorId: input.actorId || undefined,
      actorName,
      dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${recipientId}` : undefined,
    }));

    const inserted = await Notification.insertMany(docs, { ordered: false });
    return inserted.length;
  } catch (error: any) {
    // Duplicate dedupe keys (11000) are expected on retries.
    if (error?.code !== 11000 && error?.writeErrors?.every((e: any) => e?.code === 11000) !== true) {
      console.error('Notification fan-out failed:', error);
    }
    return 0;
  }
}

export const HR_AUDIENCE: Role[] = ['admin', 'hr'];
export const PEOPLE_AUDIENCE: Role[] = ['admin', 'hr', 'manager', 'employee'];
