/**
 * Probation tracking helpers (pure — safe on server and client).
 *
 * A new hire is on probation from their joining date for a fixed number of
 * months. The end date is stored on the user record so lists, reminders and
 * confirmation decisions never have to recompute from a mutable config.
 */

export const DEFAULT_PROBATION_MONTHS = 3;

/** Probation windows closing within this many days are flagged as due. */
export const PROBATION_DUE_SOON_DAYS = 30;

export type ProbationStatus = 'on_probation' | 'confirmed';

export type ProbationPhase =
  | 'none' // no probation window recorded
  | 'active' // comfortably inside the window
  | 'due_soon' // closing within PROBATION_DUE_SOON_DAYS
  | 'overdue' // end date passed, still unconfirmed
  | 'confirmed'; // confirmed (or probation waived at hire)

const MS_PER_DAY = 86_400_000;

/** Local midnight, so "days left" never flips an hour early or late. */
export function startOfDay(input: Date | string): Date {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Whole calendar days from `from` to `target` (negative when target passed). */
export function daysBetween(target: Date | string, from: Date | string = new Date()): number {
  return Math.round((startOfDay(target).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

/** Adds months, clamping to the last valid day (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(input: Date | string, months: number): Date {
  const date = startOfDay(input);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDayOfMonth));
  return date;
}

export interface ProbationWindow {
  startDate: Date;
  endDate: Date;
  months: number;
}

/** Builds a probation window. `months <= 0` means "no probation" (returns null). */
export function buildProbationWindow(
  start: Date | string,
  months: number = DEFAULT_PROBATION_MONTHS
): ProbationWindow | null {
  if (!Number.isFinite(months) || months <= 0) return null;
  const startDate = startOfDay(start);
  return {
    startDate,
    endDate: addMonths(startDate, months),
    months,
  };
}

export interface ProbationSource {
  probationStatus?: ProbationStatus | null;
  probationStartDate?: Date | string | null;
  probationEndDate?: Date | string | null;
  probationMonths?: number | null;
}

export interface ProbationInfo {
  status: 'none' | ProbationStatus;
  startDate: Date | null;
  endDate: Date | null;
  months: number | null;
  /** Whole days until the window closes; negative when it already has. */
  daysLeft: number | null;
  phase: ProbationPhase;
}

export function getProbationInfo(user: ProbationSource, now: Date = new Date()): ProbationInfo {
  const startDate = user.probationStartDate ? new Date(user.probationStartDate) : null;
  const endDate = user.probationEndDate ? new Date(user.probationEndDate) : null;
  const months = user.probationMonths ?? null;
  const status = user.probationStatus ?? (endDate ? 'on_probation' : 'none');

  if (status === 'confirmed') {
    return { status: 'confirmed', startDate, endDate, months, daysLeft: null, phase: 'confirmed' };
  }

  if (!endDate || status === 'none') {
    return { status: 'none', startDate, endDate, months, daysLeft: null, phase: 'none' };
  }

  const daysLeft = daysBetween(endDate, now);
  const phase: ProbationPhase =
    daysLeft < 0 ? 'overdue' : daysLeft <= PROBATION_DUE_SOON_DAYS ? 'due_soon' : 'active';

  return { status: 'on_probation', startDate, endDate, months, daysLeft, phase };
}

/** Short, human line for a probation chip. */
export function probationLabel(info: Pick<ProbationInfo, 'phase' | 'daysLeft'>): string {
  switch (info.phase) {
    case 'confirmed':
      return 'Confirmed';
    case 'overdue':
      return `${Math.abs(info.daysLeft ?? 0)}d overdue`;
    case 'due_soon':
    case 'active':
      return info.daysLeft === 0 ? 'Ends today' : `${info.daysLeft}d left`;
    default:
      return 'Not tracked';
  }
}

/** Chip classes for each probation phase (theme-token based). */
export function probationPhaseClasses(phase: ProbationPhase): string {
  switch (phase) {
    case 'overdue':
      return 'border-destructive/30 bg-destructive/10 text-destructive';
    case 'due_soon':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'confirmed':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'active':
      return 'border-primary/25 bg-primary/10 text-primary';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}
