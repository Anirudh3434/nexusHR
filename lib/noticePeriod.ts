/**
 * Notice-period tracking helpers (pure — safe on server and client).
 *
 * A resignation or termination stores the day notice was given and the last
 * working date. Everything else (days served, days left, overdue) is derived
 * so the numbers can never drift from those two dates.
 */
import { daysBetween, startOfDay } from './probation';

/** Notices closing within this many days are flagged as due. */
export const NOTICE_DUE_SOON_DAYS = 7;

/** Statuses where the employee is still serving out their notice. */
export const RESIGNATION_ACTIVE_STATUSES = ['pending', 'under_review', 'approved'] as const;
export const TERMINATION_ACTIVE_STATUSES = ['pending', 'under_review', 'approved'] as const;

export type NoticePhase =
  | 'none' // dates missing
  | 'inactive' // record closed (rejected / withdrawn / completed)
  | 'not_started' // notice starts in the future
  | 'serving' // active, more than NOTICE_DUE_SOON_DAYS left
  | 'due_soon' // active, last working day within NOTICE_DUE_SOON_DAYS
  | 'overdue'; // last working day passed but record is still open

export interface NoticeSource {
  noticeStart?: Date | string | null;
  lastWorkingDate?: Date | string | null;
  status?: string | null;
  activeStatuses?: readonly string[];
}

export interface NoticeInfo {
  phase: NoticePhase;
  isActive: boolean;
  /** Days until the last working day; negative once it has passed. */
  daysLeft: number | null;
  /** Length of the notice in days (from the stored count, not the dates). */
  totalDays: number | null;
  /** Days already served, clamped to the notice length. */
  servedDays: number | null;
  /** 0–100 for progress bars. */
  progress: number;
}

export function getNoticeInfo(
  { noticeStart, lastWorkingDate, status, activeStatuses = RESIGNATION_ACTIVE_STATUSES }: NoticeSource,
  now: Date = new Date()
): NoticeInfo {
  const start = noticeStart ? startOfDay(noticeStart) : null;
  const end = lastWorkingDate ? startOfDay(lastWorkingDate) : null;
  const isActive = !status || activeStatuses.includes(status);

  if (!start || !end) {
    return { phase: 'none', isActive, daysLeft: null, totalDays: null, servedDays: null, progress: 0 };
  }

  const daysLeft = daysBetween(end, now);
  const totalDays = Math.max(1, daysBetween(end, start));
  const servedDays = Math.min(totalDays, Math.max(0, totalDays - daysLeft));
  const progress = Math.round((servedDays / totalDays) * 100);

  if (!isActive) {
    return { phase: 'inactive', isActive, daysLeft, totalDays, servedDays, progress: 100 };
  }

  const phase: NoticePhase =
    daysBetween(start, now) > 0
      ? 'not_started'
      : daysLeft < 0
        ? 'overdue'
        : daysLeft <= NOTICE_DUE_SOON_DAYS
          ? 'due_soon'
          : 'serving';

  return { phase, isActive, daysLeft, totalDays, servedDays, progress };
}

/** Short, human line for a notice chip. */
export function noticeLabel(info: NoticeInfo): string {
  switch (info.phase) {
    case 'overdue':
      return `${Math.abs(info.daysLeft ?? 0)}d past last day`;
    case 'due_soon':
      return info.daysLeft === 0 ? 'Last day today' : `${info.daysLeft}d left`;
    case 'serving':
      return `${info.daysLeft}d left`;
    case 'not_started':
      return 'Starts soon';
    default:
      return 'Closed';
  }
}

export function noticePhaseClasses(phase: NoticePhase): string {
  switch (phase) {
    case 'overdue':
      return 'border-destructive/30 bg-destructive/10 text-destructive';
    case 'due_soon':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'serving':
      return 'border-primary/25 bg-primary/10 text-primary';
    case 'not_started':
      return 'border-border bg-muted text-muted-foreground';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}
