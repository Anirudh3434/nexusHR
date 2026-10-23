"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card";
import type { Module, Permission } from "../../lib/permissions";

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
        <Card key={group.name}>
          <CardHeader>
            <CardTitle className="text-base">{group.name}</CardTitle>
            <CardDescription>
              {group.modules.filter((m) => isCustom(m)).length} of {group.modules.length} customized
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left font-semibold text-muted-foreground">Module</th>
                  {PERMISSION_COLUMNS.map((col) => (
                    <th key={col.key} className="px-2 py-2 text-center font-semibold text-muted-foreground">{col.label}</th>
                  ))}
                  <th className="py-2 pl-2 text-right font-semibold text-muted-foreground">Row</th>
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
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex items-center gap-2 font-medium text-foreground">
                          {prettyModule(module)}
                          {custom && <span className="h-1.5 w-1.5 rounded-full bg-primary" title={`Differs from ${customNoun}`} />}
                          {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Unsaved changes" />}
                        </span>
                      </td>
                      {PERMISSION_COLUMNS.map((col) => {
                        const on = perms.includes(col.key);
                        const inherits = basePerms ? basePerms.includes(col.key) : false;
                        const differsFromBase = basePerms !== undefined && on !== inherits;
                        return (
                          <td key={col.key} className="px-2 py-2 text-center">
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
                              className={`relative inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                on
                                  ? col.key === "manage"
                                    ? "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                                    : col.key === "delete"
                                      ? "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300"
                                      : "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : "border-border text-muted-foreground/50 hover:border-muted-foreground hover:text-muted-foreground"
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
                      <td className="py-2 pl-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => onSetRow(module, ["view", "create", "edit", "delete", "approve", "manage"])}
                          className="mr-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                        >
                          All
                        </button>
                        <button
                          onClick={() => onSetRow(module, [])}
                          className="mr-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                        >
                          None
                        </button>
                        {(custom || dirty) && (
                          <button
                            onClick={() => onReset(module)}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-destructive"
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
