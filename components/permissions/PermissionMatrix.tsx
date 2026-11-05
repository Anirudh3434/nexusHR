"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card";
import type { Module, Permission } from "../../lib/permissions";
import { ArrowRightLeft } from "lucide-react";

export const PERMISSION_COLUMNS: { key: Permission; label: string }[] = [
  { key: "view", label: "View" },
  { key: "create", label: "Create" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
  { key: "approve", label: "Approve" },
  { key: "manage", label: "Manage" },
];

export const MODULE_GROUPS: { name: string; modules: Module[] }[] = [
  { name: "People & Workforce", modules: ["employees", "departments", "designations", "attendance", "leave", "leave_types", "onboarding"] },
  { name: "Talent", modules: ["recruitment", "surveys"] },
  { name: "Finance", modules: ["payroll", "expenses"] },
  { name: "Service Desk", modules: ["tickets", "resignations", "terminations", "notices", "holidays"] },
  { name: "Projects", modules: ["projects", "tasks", "project_documents", "project_notes", "project_credentials", "project_resources", "project_onboarding"] },
  { name: "Insights", modules: ["dashboard", "reports", "reports_analytics", "retention_analytics", "hr_knowledge_base"] },
  { name: "System", modules: ["company", "users", "settings"] },
];

export function prettyModule(module: string) {
  return module
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function sameList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((p) => set.has(p));
}

export interface PermissionMatrixProps {
  groups: { name: string; modules: Module[] }[];
  getPerms: (module: Module) => string[];
  isCustom: (module: Module) => boolean;
  isDirty: (module: Module) => boolean;
  /** Role-inherited list for the cell (only used in per-user mode to hint). */
  getBasePerms?: (module: Module) => string[];
  onToggle: (module: Module, perm: Permission) => void;
  onSetRow: (module: Module, perms: string[]) => void;
  onReset: (module: Module) => void;
  /** Human label for aria/description, e.g. "Admin" or "Jane Doe". */
  contextLabel: string;
  /** Noun for a customized cell; "role default" or "their role". */
  customNoun: string;
  emptyMessage: string;
}

export function PermissionMatrix({
  groups,
  getPerms,
  isCustom,
  isDirty,
  getBasePerms,
  onToggle,
  onSetRow,
  onReset,
  contextLabel,
  customNoun,
  emptyMessage,
}: PermissionMatrixProps) {
  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <Card key={group.name} className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="p-4 sm:p-6 pb-2.5 sm:pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold">{group.name}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {group.modules.filter((m) => isCustom(m)).length} of {group.modules.length} customized
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground sm:hidden font-medium bg-muted/60 px-2 py-0.5 rounded-full shrink-0">
                <ArrowRightLeft size={11} className="text-primary" />
                <span>Swipe for all</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0 overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[500px] border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 sm:bg-transparent">
                  {/* Sticky left module column on mobile & desktop */}
                  <th className="sticky left-0 z-20 bg-card py-2.5 px-3 sm:px-4 text-left font-semibold text-muted-foreground border-r border-border/60 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] min-w-[125px] sm:min-w-[150px]">
                    Module
                  </th>
                  {PERMISSION_COLUMNS.map((col) => (
                    <th key={col.key} className="px-1.5 sm:px-2 py-2.5 text-center font-semibold text-muted-foreground text-xs whitespace-nowrap min-w-[44px]">
                      {col.label}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right font-semibold text-muted-foreground text-xs whitespace-nowrap min-w-[85px]">
                    Row
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.modules.map((module) => {
                  const perms = getPerms(module);
                  const custom = isCustom(module);
                  const dirty = isDirty(module);
                  const basePerms = getBasePerms ? getBasePerms(module) : undefined;
                  return (
                    <tr key={module} className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors">
                      {/* Sticky module cell anchored on the left */}
                      <td className="sticky left-0 z-10 bg-card py-2 px-3 sm:px-4 border-r border-border/60 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                        <span className="inline-flex items-center gap-1.5 font-medium text-foreground truncate max-w-[115px] sm:max-w-none text-xs sm:text-sm">
                          {prettyModule(module)}
                          {custom && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title={`Differs from ${customNoun}`} />}
                          {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}
                        </span>
                      </td>
                      {PERMISSION_COLUMNS.map((col) => {
                        const on = perms.includes(col.key);
                        const inherits = basePerms ? basePerms.includes(col.key) : false;
                        const differsFromBase = basePerms !== undefined && on !== inherits;
                        return (
                          <td key={col.key} className="px-1.5 sm:px-2 py-2 text-center whitespace-nowrap min-w-[44px]">
                            <button
                              onClick={() => onToggle(module, col.key)}
                              aria-pressed={on}
                              aria-label={`${on ? "Revoke" : "Grant"} ${col.label} on ${prettyModule(module)} for ${contextLabel}`}
                              title={
                                basePerms === undefined
                                  ? `${on ? "Revoke" : "Grant"} ${col.label}`
                                  : `${on ? "Revoke" : "Grant"} ${col.label}` +
                                    (differsFromBase ? ` — differs from role` : "")
                              }
                              className={`relative inline-flex h-7 w-7 sm:h-6 sm:w-6 items-center justify-center rounded-lg sm:rounded-md border text-xs sm:text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer ${
                                on
                                  ? col.key === "manage"
                                    ? "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                                    : col.key === "delete"
                                      ? "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300"
                                      : "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : "border-border text-muted-foreground/40 hover:border-muted-foreground hover:text-muted-foreground"
                              }`}
                            >
                              {on ? "●" : "○"}
                              {differsFromBase && (
                                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden />
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right whitespace-nowrap min-w-[85px]">
                        <button
                          onClick={() => onSetRow(module, ["view", "create", "edit", "delete", "approve", "manage"])}
                          className="mr-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          All
                        </button>
                        <button
                          onClick={() => onSetRow(module, [])}
                          className="mr-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          None
                        </button>
                        {(custom || dirty) && (
                          <button
                            onClick={() => onReset(module)}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default PermissionMatrix;
