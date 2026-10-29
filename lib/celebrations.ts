/**
 * Login celebrations (pure — safe on server and client).
 *
 * The dashboard greets a returning user with animated cards when something
 * worth marking happened to them: a birthday, a work anniversary, the close
 * of their probation window, or the end of their notice period. Everything is
 * derived from dates already stored on the user / resignation record, so no
 * extra collection is needed.
 */
import { daysBetween } from './probation';

/** Probation and notice milestones stay celebrated for this many days. */
export const CELEBRATION_WINDOW_DAYS = 7;

/** Feed kinds produced by the notification fan-out (leave, ticket, ...). */
export const FEED_KINDS = [
  'leave',
  'resignation',
  'ticket',
  'task',
  'payroll',
  'expense',
  'announcement',
  'system',
] as const;

export type FeedKind = (typeof FEED_KINDS)[number];

export type CelebrationKind =
  | 'birthday'
  | 'anniversary'
  | 'probation'
  | 'notice'
  | 'welcome'
  | FeedKind;

export interface Celebration {
  id: string;
  kind: CelebrationKind;
  title: string;
  message: string;
  meta: string;
  href: string;
}

/** Shape returned by GET /api/notifications. */
export interface FeedNotification {
  id: string;
  kind: string;
  title: string;
  message: string;
  href: string;
  meta?: string | null;
  createdAt?: string;
}

export function isFeedKind(kind: string): kind is FeedKind {
  return (FEED_KINDS as readonly string[]).includes(kind);
}

/** Turns a stored notification into a card for the login celebration. */
export function notificationToCelebration(item: FeedNotification): Celebration {
  return {
    id: `notification-${item.id}`,
    kind: isFeedKind(item.kind) ? item.kind : 'system',
    title: item.title,
    message: item.message,
    meta: item.meta || '',
    href: item.href,
  };
}

export interface CelebrationSource {
  name?: string | null;
  companyName?: string | null;
  dob?: Date | string | null;
  joiningDate?: Date | string | null;
  probationStatus?: 'on_probation' | 'confirmed' | null;
  probationEndDate?: Date | string | null;
  probationConfirmedAt?: Date | string | null;
  resignations?: { lastWorkingDate?: Date | string | null }[];
}

function toDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Same calendar day, ignoring the year. */
export function isSameMonthDay(date: Date, now: Date): boolean {
  return date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

/** Whole days since `date`; 0 today, negative when it is still ahead. */
function daysAgo(date: Date, now: Date): number {
  return -daysBetween(date, now);
}

function shortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/** Builds the celebration cards for one user, newest milestones first. */
export function buildCelebrations(
  source: CelebrationSource,
  now: Date = new Date()
): Celebration[] {
  const cards: Celebration[] = [];
  const firstName = (source.name || '').trim().split(/\s+/)[0] || 'there';
  const company = (source.companyName || '').trim();

  const dob = toDate(source.dob);
  if (dob && isSameMonthDay(dob, now)) {
    cards.push({
      id: 'birthday',
      kind: 'birthday',
      title: `Happy birthday, ${firstName}!`,
      message: 'Wishing you a brilliant year ahead.',
      meta: 'Today',
      href: '/profile',
    });
  }

  const joined = toDate(source.joiningDate);
  if (joined && isSameMonthDay(joined, now)) {
    const years = now.getFullYear() - joined.getFullYear();
    if (years >= 1) {
      cards.push({
        id: 'anniversary',
        kind: 'anniversary',
        title: `${years} ${years === 1 ? 'year' : 'years'} with ${company || 'the team'}`,
        message: 'Thank you for everything you have built here.',
        meta: `Since ${joined.getFullYear()}`,
        href: '/profile',
      });
    }
  }

  const probationEnd = toDate(source.probationEndDate);
  const probationConfirmedAt = toDate(source.probationConfirmedAt);

  if (
    source.probationStatus === 'confirmed' &&
    probationConfirmedAt &&
    daysAgo(probationConfirmedAt, now) <= CELEBRATION_WINDOW_DAYS
  ) {
    cards.push({
      id: 'probation',
      kind: 'probation',
      title: 'Probation complete',
      message: 'You are confirmed — welcome to the team for good.',
      meta: `Confirmed ${shortDate(probationConfirmedAt)}`,
      href: '/probation',
    });
  } else if (
    source.probationStatus === 'on_probation' &&
    probationEnd &&
    daysAgo(probationEnd, now) >= 0 &&
    daysAgo(probationEnd, now) <= CELEBRATION_WINDOW_DAYS
  ) {
    cards.push({
      id: 'probation',
      kind: 'probation',
      title: 'Probation window complete',
      message: `Your review window closed on ${shortDate(probationEnd)}.`,
      meta: 'Awaiting confirmation',
      href: '/probation',
    });
  }

  for (const record of source.resignations || []) {
    const lastDay = toDate(record.lastWorkingDate);
    if (!lastDay) continue;
    const ago = daysAgo(lastDay, now);
    if (ago < 0 || ago > CELEBRATION_WINDOW_DAYS) continue;
    cards.push({
      id: 'notice',
      kind: 'notice',
      title: 'Notice period complete',
      message: `Your last working day was ${shortDate(lastDay)}.`,
      meta: 'Notice served',
      href: '/my-resignation',
    });
    break;
  }

  return cards;
}
