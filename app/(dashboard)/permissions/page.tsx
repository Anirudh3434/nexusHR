"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button } from "../../../components/ui/Button";
import { ShieldAlert, RotateCcw, Save, Search, Copy, Lock, Users, UserCog, ChevronDown, Check } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import type { Module, Permission } from "../../../lib/permissions";
import {
  PermissionMatrix,
  MODULE_GROUPS,
  prettyModule,
  sameList,
} from "../../../components/permissions/PermissionMatrix";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  hr: "HR",
  manager: "Manager",
  employee: "Employee",
};

type Scope = "role" | "user";

interface CompanyOption {
  id: string;
  name: string;
  code: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
  customized: number;
}

interface UserDetail {
  user: { id: string; name: string; email: string; role: string; department: string };
  role: string;
  base: Record<string, string[]>;
  matrix: Record<string, string[]>;
  customized: Record<string, boolean>;
}

export default function PermissionsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const isSuperAdmin = (user?.role as string) === "super_admin";
  const isAdmin = user?.role === "admin";
  const canManage = isSuperAdmin || isAdmin;

  const [scope, setScope] = useState<Scope>("role");
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState<string>(user?.companyId || "");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // ---- Role scope ----
  const [roles, setRoles] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, string[]>>>({});
  const [customized, setCustomized] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState("admin");
  const [edits, setEdits] = useState<Record<string, string[]>>({});
  const [copyFrom, setCopyFrom] = useState("");

  // ---- User scope ----
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [activeUserId, setActiveUserId] = useState("");
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userEdits, setUserEdits] = useState<Record<string, string[]>>({});

  // Admins are scoped to their own company; platform admins pick one.
  useEffect(() => {
    if (!isSuperAdmin && user?.companyId) setCompanyId(user.companyId);
  }, [isSuperAdmin, user?.companyId]);

  useEffect(() => {
    if (!isSuperAdmin || !canManage) return;
    fetch("/api/companies/list")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.companies) setCompanies(data.companies);
      })
      .catch(() => {});
  }, [isSuperAdmin, canManage]);

  const fetchMatrix = useCallback(async (cid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/permissions?companyId=${encodeURIComponent(cid)}`);
      if (!res.ok) throw new Error("Failed to load permissions");
      const data = await res.json();
      setMatrix(data.matrix || {});
      setCustomized(data.customized || {});
      const fetchedRoles: string[] = data.roles || [];
      setRoles(fetchedRoles);
      setActiveRole((prev) => (fetchedRoles.includes(prev) ? prev : fetchedRoles[0] || "admin"));
      setEdits({});
    } catch {
      addToast({ type: "error", title: "Load failed", description: "Could not load the permission matrix." });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchUsers = useCallback(async (cid: string) => {
    try {
      const res = await fetch(`/api/permissions/users?companyId=${encodeURIComponent(cid)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users || []);
      setUsersLoaded(true);
    } catch {
      addToast({ type: "error", title: "Load failed", description: "Could not load the employee list." });
    }
  }, [addToast]);

  const fetchUserDetail = useCallback(async (cid: string, userId: string) => {
    setUserLoading(true);
    try {
      const res = await fetch(`/api/permissions/users?companyId=${encodeURIComponent(cid)}&userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as UserDetail;
      setUserDetail(data);
      setUserEdits({});
    } catch {
      addToast({ type: "error", title: "Load failed", description: "Could not load this employee's permissions." });
      setUserDetail(null);
    } finally {
      setUserLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!canManage || !companyId) {
      setLoading(false);
      return;
    }
    fetchMatrix(companyId);
    setUsersLoaded(false);
    setUsers([]);
    setActiveUserId("");
    setUserDetail(null);
  }, [canManage, companyId, fetchMatrix]);

  useEffect(() => {
    if (scope === "user" && companyId && !usersLoaded) fetchUsers(companyId);
  }, [scope, companyId, usersLoaded, fetchUsers]);

  useEffect(() => {
    if (scope === "user" && companyId && activeUserId) fetchUserDetail(companyId, activeUserId);
  }, [scope, companyId, activeUserId, fetchUserDetail]);

  // ---------- Role scope logic ----------
  const cellKey = (role: string, module: string) => `${role}:${module}`;
  const cellPerms = (role: string, module: string): string[] =>
    edits[cellKey(role, module)] ?? matrix[role]?.[module] ?? [];

  const roleDirtyKeys = useMemo(
    () =>
      Object.keys(edits).filter((key) => {
        const [role, module] = key.split(":");
        return !sameList(edits[key], matrix[role]?.[module] ?? []);
      }),
    [edits, matrix]
  );

  const togglePerm = (role: string, module: string, perm: string) => {
    const current = new Set(cellPerms(role, module));
    if (current.has(perm)) current.delete(perm);
    else current.add(perm);
    const next = perm === "manage" && current.has("manage")
      ? ["manage"]
      : [...current].filter((p) => p !== "manage" || !current.has("manage"));
    const order = ["view", "create", "edit", "delete", "approve", "manage"];
    next.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    setEdits((prev) => ({ ...prev, [cellKey(role, module)]: next }));
  };

  const setRoleRow = (role: string, module: string, perms: string[]) => {
    setEdits((prev) => ({ ...prev, [cellKey(role, module)]: perms }));
  };

  const resetCell = async (role: string, module: string) => {
    try {
      const res = await fetch(
        `/api/permissions?companyId=${encodeURIComponent(companyId)}&role=${role}&module=${module}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Reset", description: `${prettyModule(module)} restored to defaults for ${ROLE_LABELS[role]}.` });
      fetchMatrix(companyId);
    } catch {
      addToast({ type: "error", title: "Reset failed", description: "Could not reset this cell." });
    }
  };

  const resetRole = async (role: string) => {
    if (!window.confirm(`Reset all ${ROLE_LABELS[role]} permissions to system defaults?`)) return;
    try {
      const res = await fetch(
        `/api/permissions?companyId=${encodeURIComponent(companyId)}&role=${role}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Role reset", description: `${ROLE_LABELS[role]} restored to defaults.` });
      fetchMatrix(companyId);
    } catch {
      addToast({ type: "error", title: "Reset failed", description: "Could not reset this role." });
    }
  };

  const resetAll = async () => {
    if (!window.confirm("Reset ALL customized role permissions for this company to system defaults?")) return;
    try {
      const res = await fetch(`/api/permissions?companyId=${encodeURIComponent(companyId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "All reset", description: "Company role permissions restored to defaults." });
      fetchMatrix(companyId);
    } catch {
      addToast({ type: "error", title: "Reset failed", description: "Could not reset permissions." });
    }
  };

  const copyRole = () => {
    if (!copyFrom || copyFrom === activeRole) return;
    const next: Record<string, string[]> = { ...edits };
    for (const group of MODULE_GROUPS) {
      for (const mod of group.modules) {
        const source = matrix[copyFrom]?.[mod] ?? [];
        const key = cellKey(activeRole, mod);
        const current = next[key] ?? matrix[activeRole]?.[mod] ?? [];
        if (!sameList(source, current)) next[key] = [...source];
      }
    }
    setEdits(next);
    addToast({ type: "success", title: "Copied", description: `${ROLE_LABELS[copyFrom]} permissions staged for ${ROLE_LABELS[activeRole]}. Review and save.` });
  };

  const saveRoles = async () => {
    const results = await Promise.all(
      roleDirtyKeys.map(async (key) => {
        const [role, module] = key.split(":");
        const res = await fetch("/api/permissions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, role, module, permissions: edits[key] }),
        });
        return res.ok;
      })
    );
    if (!results.every(Boolean)) throw new Error();
    addToast({
      type: "success",
      title: "Permissions saved",
      description: `${roleDirtyKeys.length} change${roleDirtyKeys.length > 1 ? "s" : ""} saved. They apply the next time affected users sign in.`,
    });
    fetchMatrix(companyId);
  };

  // ---------- User scope logic ----------
  const userCellPerms = (module: Module): string[] =>
    userEdits[module] ?? userDetail?.matrix?.[module] ?? [];

  const userDirtyKeys = useMemo(
    () =>
      Object.keys(userEdits).filter((module) => {
        const current = userDetail?.matrix?.[module] ?? [];
        return !sameList(userEdits[module], current);
      }),
    [userEdits, userDetail]
  );

  const toggleUserPerm = (module: Module, perm: Permission) => {
    const current = new Set(userCellPerms(module));
    if (current.has(perm)) current.delete(perm);
    else current.add(perm);
    const next = perm === "manage" && current.has("manage")
      ? ["manage"]
      : [...current].filter((p) => p !== "manage" || !current.has("manage"));
    const order = ["view", "create", "edit", "delete", "approve", "manage"];
    next.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    setUserEdits((prev) => ({ ...prev, [module]: next }));
  };

  const setUserRow = (module: Module, perms: string[]) => {
    setUserEdits((prev) => ({ ...prev, [module]: perms }));
  };

  const resetUserCell = async (module: Module) => {
    if (!activeUserId) return;
    try {
      const res = await fetch(
        `/api/permissions/users?companyId=${encodeURIComponent(companyId)}&userId=${encodeURIComponent(activeUserId)}&module=${module}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Reset", description: `${prettyModule(module)} now inherits from the employee's role.` });
      fetchUserDetail(companyId, activeUserId);
      fetchUsers(companyId);
    } catch {
      addToast({ type: "error", title: "Reset failed", description: "Could not reset this cell." });
    }
  };

  const resetUserAll = async () => {
    if (!activeUserId || !userDetail) return;
    if (!window.confirm(`Remove all individual overrides for ${userDetail.user.name}? They will inherit their role's permissions.`)) return;
    try {
      const res = await fetch(
        `/api/permissions/users?companyId=${encodeURIComponent(companyId)}&userId=${encodeURIComponent(activeUserId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      addToast({ type: "success", title: "Overrides cleared", description: `${userDetail.user.name} now inherits their role.` });
      fetchUserDetail(companyId, activeUserId);
      fetchUsers(companyId);
    } catch {
      addToast({ type: "error", title: "Reset failed", description: "Could not clear overrides." });
    }
  };

  const saveUser = async () => {
    if (!activeUserId) return;
    const results = await Promise.all(
      userDirtyKeys.map(async (module) => {
        const res = await fetch("/api/permissions/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, userId: activeUserId, module, permissions: userEdits[module] }),
        });
        return res.ok;
      })
    );
    if (!results.every(Boolean)) throw new Error();
    addToast({
      type: "success",
      title: "Permissions saved",
      description: `${userDirtyKeys.length} change${userDirtyKeys.length > 1 ? "s" : ""} saved. They apply the next time this employee signs in.`,
    });
    fetchUserDetail(companyId, activeUserId);
    fetchUsers(companyId);
  };

  const saveAll = async () => {
    const dirtyCount = scope === "role" ? roleDirtyKeys.length : userDirtyKeys.length;
    if (dirtyCount === 0) return;
    setSaving(true);
    try {
      if (scope === "role") await saveRoles();
      else await saveUser();
    } catch {
      addToast({ type: "error", title: "Save failed", description: "Some changes could not be saved. Try again." });
    } finally {
      setSaving(false);
    }
  };

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MODULE_GROUPS;
    return MODULE_GROUPS.map((g) => ({
      ...g,
      modules: g.modules.filter((m) => prettyModule(m).toLowerCase().includes(q)),
    })).filter((g) => g.modules.length > 0);
  }, [search]);

  const dirtyCount = scope === "role" ? roleDirtyKeys.length : userDirtyKeys.length;

  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader icon={<ShieldAlert />} title="Roles & Permissions" />
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Only workspace admins can manage role permissions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShieldAlert />}
        title="Roles & Permissions"
        description="Set what each role can do, then fine-tune access for individual employees. Changes apply on next sign-in."
        actions={
          <>
            {scope === "role" ? (
              <Button variant="outline" size="sm" onClick={resetAll} disabled={loading || saving}>
                <RotateCcw size={15} />
                <span className="ml-2 hidden sm:inline">Reset all</span>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={resetUserAll} disabled={!activeUserId || saving}>
                <RotateCcw size={15} />
                <span className="ml-2 hidden sm:inline">Clear overrides</span>
              </Button>
            )}
            <Button size="sm" onClick={saveAll} disabled={dirtyCount === 0 || saving}>
              <Save size={15} />
              <span className="ml-2">
                {saving ? "Saving…" : dirtyCount > 0 ? `Save ${dirtyCount} change${dirtyCount > 1 ? "s" : ""}` : "Saved"}
              </span>
            </Button>
          </>
        }
      />

      {/* Scope switch */}
      <div className="inline-flex rounded-lg border border-border bg-card p-1" role="tablist" aria-label="Permission scope">
        {([
          { key: "role", label: "By Role", icon: <ShieldAlert size={15} /> },
          { key: "user", label: "By Employee", icon: <UserCog size={15} /> },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={scope === tab.key}
            onClick={() => setScope(tab.key)}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              scope === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {isSuperAdmin && (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <label htmlFor="perm-company" className="text-sm font-medium text-foreground">Company</label>
            <select
              id="perm-company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {!companyId ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Select a company to manage its permissions.</p>
          </CardContent>
        </Card>
      ) : scope === "role" ? (
        loading ? (
          <LoadingCard />
        ) : (
          <>
            {/* Role tabs */}
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Roles">
              {roles.map((role) => {
                const customCount = Object.values(customized[role] || {}).filter(Boolean).length;
                const roleDirty = roleDirtyKeys.filter((k) => k.startsWith(`${role}:`)).length;
                return (
                  <button
                    key={role}
                    role="tab"
                    aria-selected={activeRole === role}
                    onClick={() => setActiveRole(role)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      activeRole === role
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ShieldAlert size={15} />
                    {ROLE_LABELS[role] || role}
                    {customCount > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular ${activeRole === role ? "bg-white/25 text-white" : "bg-primary/10 text-primary"}`}>
                        {customCount}
                      </span>
                    )}
                    {roleDirty > 0 && <span className="h-2 w-2 rounded-full bg-amber-400" aria-label={`${roleDirty} unsaved changes`} />}
                  </button>
                );
              })}
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3.5 py-2 text-sm text-muted-foreground" title="Platform role — managed by NexusHR, not customizable">
                <Lock size={14} /> Super Admin · locked
              </span>
            </div>

            {/* Toolbar: search + copy */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchBox value={search} onChange={setSearch} placeholder="Search modules…" label="Search modules" />
              <div className="flex items-center gap-2">
                <select
                  value={copyFrom}
                  onChange={(e) => setCopyFrom(e.target.value)}
                  aria-label="Copy permissions from role"
                  className="h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Copy from…</option>
                  {roles.filter((r) => r !== activeRole).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" onClick={copyRole} disabled={!copyFrom} className="h-10">
                  <Copy size={15} />
                  <span className="ml-2 hidden sm:inline">Apply</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => resetRole(activeRole)} className="h-10 text-muted-foreground hover:text-destructive">
                  <RotateCcw size={15} />
                  <span className="ml-2 hidden sm:inline">Reset role</span>
                </Button>
              </div>
            </div>

            <PermissionMatrix
              groups={filteredGroups}
              getPerms={(module) => cellPerms(activeRole, module)}
              isCustom={(module) => !!customized[activeRole]?.[module]}
              isDirty={(module) => roleDirtyKeys.includes(cellKey(activeRole, module))}
              onToggle={(module, perm) => togglePerm(activeRole, module, perm)}
              onSetRow={(module, perms) => setRoleRow(activeRole, module, perms)}
              onReset={(module) => resetCell(activeRole, module)}
              contextLabel={ROLE_LABELS[activeRole] || activeRole}
              customNoun="the role default"
              emptyMessage={`No modules match "${search}".`}
            />
          </>
        )
      ) : (
        <>
          {/* Employee picker */}
          <UserCombobox
            users={users}
            value={activeUserId}
            onChange={(id) => setActiveUserId(id)}
          />

          {!activeUserId ? (
            <Card>
              <CardContent className="flex items-center gap-3 p-6">
                <Users className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Pick an employee to grant or revoke individual permissions. Unset cells inherit from their role.
                </p>
              </CardContent>
            </Card>
          ) : userLoading ? (
            <LoadingCard />
          ) : userDetail ? (
            <>
              <Card>
                <CardContent className="flex flex-col gap-1 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{userDetail.user.name}</p>
                    <p className="text-muted-foreground">
                      {userDetail.user.email} · Base role: {ROLE_LABELS[userDetail.role] || userDetail.role}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Object.values(userDetail.customized).filter(Boolean).length} individual override
                    {Object.values(userDetail.customized).filter(Boolean).length === 1 ? "" : "s"} · a blue dot marks a cell that differs from the role
                  </p>
                </CardContent>
              </Card>

              <PermissionMatrix
                groups={filteredGroups}
                getPerms={(module) => userCellPerms(module)}
                isCustom={(module) => !!userDetail.customized[module]}
                isDirty={(module) => userDirtyKeys.includes(module)}
                getBasePerms={(module) => userDetail.base[module] ?? []}
                onToggle={toggleUserPerm}
                onSetRow={setUserRow}
                onReset={resetUserCell}
                contextLabel={userDetail.user.name}
                customNoun="their role"
                emptyMessage={`No modules match "${search}".`}
              />
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Could not load this employee. Try another.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-label="Loading" />
      </CardContent>
    </Card>
  );
}

function comboLabel(u: UserOption) {
  return `${u.name} · ${ROLE_LABELS[u.role] || u.role}${u.customized > 0 ? ` · ${u.customized} override${u.customized > 1 ? "s" : ""}` : ""}`;
}

function UserCombobox({
  users,
  value,
  onChange,
}: {
  users: UserOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = users.find((u) => u.id === value) || null;

  const q = query.trim().toLowerCase();
  const matches = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (ROLE_LABELS[u.role] || u.role).toLowerCase().includes(q) ||
          (u.department || "").toLowerCase().includes(q)
      )
    : users;

  // Close when clicking outside the combobox
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const openMenu = () => {
    setOpen(true);
    setQuery("");
    setHighlight(Math.max(0, matches.findIndex((u) => u.id === value)));
  };

  const pick = (u: UserOption) => {
    onChange(u.id);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      openMenu();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[highlight]) pick(matches[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const displayValue = open ? query : selected ? comboLabel(selected) : "";

  return (
    <div ref={boxRef} className="relative w-full sm:max-w-md">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls="employee-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          value={displayValue}
          placeholder="Search employees by name, email, role…"
          aria-label="Search employees"
          onFocus={openMenu}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <ChevronDown
          size={16}
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open && (
        <div
          id="employee-listbox"
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-sm shadow-lg"
        >
          {matches.length === 0 ? (
            <div className="px-3 py-2 text-muted-foreground">No employees match “{query}”.</div>
          ) : (
            matches.map((u, i) => {
              const isSelected = u.id === value;
              return (
                <button
                  key={u.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(u)}
                  className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left transition-colors ${
                    i === highlight ? "bg-muted" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{u.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {u.email} · {ROLE_LABELS[u.role] || u.role}
                      {u.department ? ` · ${u.department}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {u.customized > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        {u.customized} override{u.customized > 1 ? "s" : ""}
                      </span>
                    )}
                    {isSelected && <Check size={15} className="text-primary" />}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative flex-1">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
