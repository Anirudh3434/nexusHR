import type { Role } from './permissions';

export type HierarchyLevel =
  | 'director'
  | 'manager'
  | 'lead'
  | 'senior'
  | 'junior'
  | 'intern'
  | 'hr';

export interface HierarchyLevelConfig {
  key: HierarchyLevel;
  label: string;
  shortLabel: string;
  order: number;
  badgeClass: string;
  borderClass: string;
  dotColor: string;
}

export const HIERARCHY_LEVELS: HierarchyLevelConfig[] = [
  {
    key: 'director',
    label: 'Executive / Director',
    shortLabel: 'Director',
    order: 1,
    badgeClass:
      'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border-purple-200 dark:border-purple-500/20',
    borderClass: 'border-l-purple-500',
    dotColor: '#a855f7',
  },
  {
    key: 'manager',
    label: 'Manager / Dept Head',
    shortLabel: 'Manager',
    order: 2,
    badgeClass:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20',
    borderClass: 'border-l-indigo-500',
    dotColor: '#6366f1',
  },
  {
    key: 'lead',
    label: 'Team Lead / Tech Lead',
    shortLabel: 'Lead',
    order: 3,
    badgeClass:
      'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/20',
    borderClass: 'border-l-amber-500',
    dotColor: '#f59e0b',
  },
  {
    key: 'senior',
    label: 'Senior Staff / Specialist',
    shortLabel: 'Senior',
    order: 4,
    badgeClass:
      'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/20',
    borderClass: 'border-l-blue-500',
    dotColor: '#3b82f6',
  },
  {
    key: 'junior',
    label: 'Junior / Associate',
    shortLabel: 'Junior',
    order: 5,
    badgeClass:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20',
    borderClass: 'border-l-emerald-500',
    dotColor: '#10b981',
  },
  {
    key: 'hr',
    label: 'HR & People Ops',
    shortLabel: 'HR',
    order: 2,
    badgeClass:
      'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200 dark:border-rose-500/20',
    borderClass: 'border-l-rose-500',
    dotColor: '#f43f5e',
  },
  {
    key: 'intern',
    label: 'Intern / Trainee',
    shortLabel: 'Intern',
    order: 6,
    badgeClass:
      'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border-slate-200 dark:border-slate-500/20',
    borderClass: 'border-l-slate-400',
    dotColor: '#64748b',
  },
];

export const HIERARCHY_MAP = new Map<HierarchyLevel, HierarchyLevelConfig>(
  HIERARCHY_LEVELS.map((item) => [item.key, item])
);

/**
 * Automatically infers an employee's hierarchy tier from their system role
 * and job title designation when not explicitly set.
 */
export function inferHierarchyLevel(
  role?: string | null,
  designation?: string | null
): HierarchyLevel {
  const normRole = (role || '').trim().toLowerCase();
  const normDesig = (designation || '').trim().toLowerCase();

  if (normRole === 'super_admin' || normRole === 'admin') {
    if (normDesig.includes('hr') || normDesig.includes('people') || normDesig.includes('talent')) {
      return 'hr';
    }
    return 'director';
  }

  if (
    normRole === 'hr' ||
    normDesig.includes('hr') ||
    normDesig.includes('human resources') ||
    normDesig.includes('talent') ||
    normDesig.includes('people partner') ||
    normDesig.includes('recruiter')
  ) {
    return 'hr';
  }

  if (
    normRole === 'manager' ||
    normDesig.includes('manager') ||
    normDesig.includes('head') ||
    normDesig.includes('director') ||
    normDesig.includes('vp') ||
    normDesig.includes('vice president')
  ) {
    return 'manager';
  }

  if (
    normDesig.includes('lead') ||
    normDesig.includes('tech lead') ||
    normDesig.includes('team lead') ||
    normDesig.includes('architect') ||
    normDesig.includes('scrum master') ||
    normDesig.includes('principal')
  ) {
    return 'lead';
  }

  if (
    normDesig.includes('senior') ||
    normDesig.includes('sr') ||
    normDesig.includes('specialist') ||
    normDesig.includes('level 3') ||
    normDesig.includes('iii') ||
    normDesig.includes('ii')
  ) {
    return 'senior';
  }

  if (
    normDesig.includes('intern') ||
    normDesig.includes('trainee') ||
    normDesig.includes('apprentice')
  ) {
    return 'intern';
  }

  return 'junior';
}

