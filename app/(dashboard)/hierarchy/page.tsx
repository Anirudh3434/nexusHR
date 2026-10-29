"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Users,
  Search,
  Network,
  LayoutGrid,
  GitFork,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronLeft,
  UserCheck,
  Briefcase,
  Building,
  Mail,
  Edit2,
  X,
  AlertCircle,
  Crown,
  Shield,
  Zap,
  Award,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronsUpDown,
  ChevronsDownUp,
  FilterX,
  ListTree,
  LocateFixed,
  Hand,
  Move,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  HIERARCHY_LEVELS,
  HIERARCHY_MAP,
  type HierarchyLevel,
} from "@/lib/hierarchy";
import { cn } from "@/lib/utils";

interface EmployeeItem {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  avatar: string | null;
  phone: string | null;
  employeeId: string | null;
  reportsToId: string | null;
  reportsTo: {
    id: string;
    name: string;
    designation: string;
    avatar: string | null;
    hierarchyLevel: HierarchyLevel;
  } | null;
  hierarchyLevel: HierarchyLevel;
  directReportsCount: number;
}

interface HierarchyTreeNode extends EmployeeItem {
  children: HierarchyTreeNode[];
}

interface FilteredTreeNode extends HierarchyTreeNode {
  isDirectMatch: boolean;
  hasMatchingDescendant: boolean;
  children: FilteredTreeNode[];
}

interface HierarchyStats {
  total: number;
  directors: number;
  managers: number;
  leads: number;
  seniors: number;
  juniors: number;
  interns: number;
  hr: number;
  unassignedManagerCount: number;
}

const LEVEL_ICONS: Record<HierarchyLevel, React.ReactNode> = {
  director: <Crown className="w-3.5 h-3.5" />,
  manager: <Shield className="w-3.5 h-3.5" />,
  lead: <Zap className="w-3.5 h-3.5" />,
  senior: <Award className="w-3.5 h-3.5" />,
  junior: <Sparkles className="w-3.5 h-3.5" />,
  intern: <GraduationCap className="w-3.5 h-3.5" />,
  hr: <UserCheck className="w-3.5 h-3.5" />,
};

/**
 * Search Highlight component
 */
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-300 dark:bg-amber-500/40 text-inherit rounded-xs px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function HierarchyPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [tree, setTree] = useState<HierarchyTreeNode[]>([]);
  const [stats, setStats] = useState<HierarchyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View modes: 'chart' (Visual Org Chart Tree), 'tree' (Indented Directory Tree), 'matrix' (Tier Matrix)
  const [viewMode, setViewMode] = useState<"chart" | "tree" | "matrix">("chart");
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");

  // Chart Zoom Level
  const [zoom, setZoom] = useState(1);

  // Canvas ref & Drag-to-Pan State
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });
  const touchStartRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  // Node collapse map
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  // Edit Modal State
  const [editEmployee, setEditEmployee] = useState<EmployeeItem | null>(null);
  const [editManagerId, setEditManagerId] = useState<string>("");
  const [editLevel, setEditLevel] = useState<HierarchyLevel>("junior");
  const [editDesignation, setEditDesignation] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchHierarchy = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/hierarchy");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load hierarchy");
      }
      const data = await res.json();
      setEmployees(data.employees || []);
      setTree(data.tree || []);
      setStats(data.stats || null);
    } catch (err: any) {
      console.error("Hierarchy fetch error:", err);
      setError(err.message || "Error loading hierarchy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Is any filter active?
  const isFilterActive = useMemo(() => {
    return search.trim() !== "" || selectedDept !== "all" || selectedLevel !== "all";
  }, [search, selectedDept, selectedLevel]);

  // Filtered employees list (for stats, counts, and matrix view)
  const filteredEmployees = useMemo(() => {
    const norm = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchSearch =
        norm === "" ||
        emp.name.toLowerCase().includes(norm) ||
        emp.email.toLowerCase().includes(norm) ||
        emp.designation.toLowerCase().includes(norm) ||
        emp.department.toLowerCase().includes(norm);

      const matchDept = selectedDept === "all" || emp.department === selectedDept;
      const matchLevel = selectedLevel === "all" || emp.hierarchyLevel === selectedLevel;

      return matchSearch && matchDept && matchLevel;
    });
  }, [employees, search, selectedDept, selectedLevel]);

  // Filtered Tree (applies filters recursively to the tree so parent-child structure is preserved!)
  const filteredTree = useMemo(() => {
    if (!isFilterActive) {
      const markNode = (node: HierarchyTreeNode): FilteredTreeNode => ({
        ...node,
        isDirectMatch: true,
        hasMatchingDescendant: false,
        children: (node.children || []).map(markNode),
      });
      return tree.map(markNode);
    }

    const norm = search.trim().toLowerCase();

    function filterNode(node: HierarchyTreeNode): FilteredTreeNode | null {
      const matchSearch =
        norm === "" ||
        node.name.toLowerCase().includes(norm) ||
        node.email.toLowerCase().includes(norm) ||
        node.designation.toLowerCase().includes(norm) ||
        node.department.toLowerCase().includes(norm);

      const matchDept = selectedDept === "all" || node.department === selectedDept;
      const matchLevel = selectedLevel === "all" || node.hierarchyLevel === selectedLevel;

      const direct = matchSearch && matchDept && matchLevel;

      const filteredChildren: FilteredTreeNode[] = [];
      for (const child of node.children || []) {
        const filteredChild = filterNode(child);
        if (filteredChild) {
          filteredChildren.push(filteredChild);
        }
      }

      // Include node if it directly matches OR if any descendant matches
      if (direct || filteredChildren.length > 0) {
        return {
          ...node,
          isDirectMatch: direct,
          hasMatchingDescendant: filteredChildren.length > 0,
          children: filteredChildren,
        };
      }

      return null;
    }

    const result: FilteredTreeNode[] = [];
    for (const root of tree) {
      const filtered = filterNode(root);
      if (filtered) result.push(filtered);
    }
    return result;
  }, [tree, isFilterActive, search, selectedDept, selectedLevel]);

  // Center the view on root leader
  const centerView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maxScrollLeft = canvas.scrollWidth - canvas.clientWidth;
    canvas.scrollTo({
      left: Math.max(0, maxScrollLeft / 2),
      top: 0,
      behavior: "smooth",
    });
  }, []);

  // Programmatic pan by dx, dy
  const panBy = useCallback((dx: number, dy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.scrollBy({
      left: dx,
      top: dy,
      behavior: "smooth",
    });
  }, []);

  // Initial auto-centering on tree load or filter change
  useEffect(() => {
    if (filteredTree.length > 0 && viewMode === "chart") {
      const timer = setTimeout(() => {
        centerView();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [filteredTree, viewMode, centerView]);

  // Global mouseup listener so dragging never gets stuck if cursor leaves canvas
  useEffect(() => {
    const onGlobalMouseUp = () => {
      setIsPanning(false);
    };
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", onGlobalMouseUp);
    };
  }, []);

  // Canvas Mouse Drag Panning Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with left mouse button
    if (e.button !== 0) return;

    // Ignore clicks on buttons, inputs, links, or modal triggers
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, a, [role='button'], textarea")) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsPanning(true);
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: canvas.scrollLeft,
      scrollTop: canvas.scrollTop,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPanning || !canvasRef.current) return;
      e.preventDefault();
      const dx = e.clientX - panStartRef.current.startX;
      const dy = e.clientY - panStartRef.current.startY;
      canvasRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
      canvasRef.current.scrollTop = panStartRef.current.scrollTop - dy;
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Canvas Touch Drag Handlers (Mobile / Tablets)
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, a, [role='button']")) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = e.touches[0];
    touchStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      scrollLeft: canvas.scrollLeft,
      scrollTop: canvas.scrollTop,
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1 || !canvasRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.startX;
    const dy = touch.clientY - touchStartRef.current.startY;
    canvasRef.current.scrollLeft = touchStartRef.current.scrollLeft - dx;
    canvasRef.current.scrollTop = touchStartRef.current.scrollTop - dy;
  }, []);

  // Collapse toggle
  const toggleCollapse = useCallback((id: string) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Expand all nodes
  const handleExpandAll = () => {
    setCollapsedMap({});
  };

  // Collapse all nodes with children
  const handleCollapseAll = () => {
    const map: Record<string, boolean> = {};
    employees.forEach((emp) => {
      if (emp.directReportsCount > 0) {
        map[emp.id] = true;
      }
    });
    setCollapsedMap(map);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setSelectedDept("all");
    setSelectedLevel("all");
  };

  // Open edit modal
  const openEditModal = (emp: EmployeeItem) => {
    setEditEmployee(emp);
    setEditManagerId(emp.reportsToId || "");
    setEditLevel(emp.hierarchyLevel);
    setEditDesignation(emp.designation);
    setSaveMessage(null);
  };

  const closeEditModal = () => {
    setEditEmployee(null);
    setSaveMessage(null);
  };

  // Submit edit
  const handleSaveHierarchy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployee) return;

    try {
      setSaving(true);
      setSaveMessage(null);

      const res = await fetch("/api/hierarchy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: editEmployee.id,
          reportsTo: editManagerId ? editManagerId : null,
          hierarchyLevel: editLevel,
          designation: editDesignation.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveMessage({ type: "error", text: data.message || "Failed to update hierarchy" });
        return;
      }

      setSaveMessage({ type: "success", text: "Hierarchy updated successfully!" });
      setTimeout(() => {
        closeEditModal();
        fetchHierarchy();
      }, 700);
    } catch (err: any) {
      setSaveMessage({ type: "error", text: err.message || "Network error" });
    } finally {
      setSaving(false);
    }
  };

  // Find all descendants of an employee to prevent cycles in dropdown
  const candidateManagers = useMemo(() => {
    if (!editEmployee) return [];

    const descendants = new Set<string>();
    const findSubordinates = (id: string) => {
      employees.forEach((e) => {
        if (e.reportsToId === id && !descendants.has(e.id)) {
          descendants.add(e.id);
          findSubordinates(e.id);
        }
      });
    };
    findSubordinates(editEmployee.id);

    return employees.filter((e) => e.id !== editEmployee.id && !descendants.has(e.id));
  }, [employees, editEmployee]);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        icon={<Network className="h-6 w-6 text-primary" />}
        title="Organization Hierarchy"
        description="Visualize and manage reporting structure across Executives, Managers, Leads, Seniors, Juniors, and HR."
        actions={
          <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode("chart")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                viewMode === "chart"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Visual top-down organization chart"
            >
              <GitFork className="w-3.5 h-3.5 text-primary" />
              <span>Org Chart (Tree)</span>
            </button>
            <button
              onClick={() => setViewMode("tree")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                viewMode === "tree"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Collapsible branch directory tree"
            >
              <ListTree className="w-3.5 h-3.5 text-indigo-500" />
              <span>Directory Tree</span>
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                viewMode === "matrix"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grouped by level tier"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Level Matrix</span>
            </button>
          </div>
        }
      />

      {/* KPI Stats Bar with click-to-filter */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <button
            onClick={() => setSelectedLevel("all")}
            className={cn(
              "text-left rounded-xl border p-3 shadow-xs transition-all cursor-pointer",
              selectedLevel === "all"
                ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                : "border-border bg-card hover:border-border/80"
            )}
          >
            <div className="text-[11px] font-medium text-muted-foreground">Total Team</div>
            <div className="text-xl font-bold text-foreground mt-0.5">{stats.total}</div>
          </button>

          <button
            onClick={() => setSelectedLevel(selectedLevel === "director" ? "all" : "director")}
            className={cn(
              "text-left rounded-xl border p-3 shadow-xs transition-all cursor-pointer",
              selectedLevel === "director"
                ? "border-purple-500 ring-2 ring-purple-500/30 bg-purple-100/80 dark:bg-purple-900/40"
                : "border-purple-200/80 bg-purple-50/60 dark:bg-purple-500/10 dark:border-purple-500/20 hover:border-purple-400"
            )}
          >
            <div className="flex items-center gap-1 text-[11px] font-medium text-purple-700 dark:text-purple-300">
              <Crown className="w-3.5 h-3.5" />
              <span>Directors</span>
            </div>
            <div className="text-xl font-bold text-purple-800 dark:text-purple-200 mt-0.5">
              {stats.directors}
            </div>
          </button>

          <button
            onClick={() => setSelectedLevel(selectedLevel === "manager" ? "all" : "manager")}
            className={cn(
              "text-left rounded-xl border p-3 shadow-xs transition-all cursor-pointer",
              selectedLevel === "manager"
                ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-100/80 dark:bg-indigo-900/40"
                : "border-indigo-200/80 bg-indigo-50/60 dark:bg-indigo-500/10 dark:border-indigo-500/20 hover:border-indigo-400"
            )}
          >
            <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Managers</span>
            </div>
            <div className="text-xl font-bold text-indigo-800 dark:text-indigo-200 mt-0.5">
              {stats.managers}
            </div>
          </button>

          <button
            onClick={() => setSelectedLevel(selectedLevel === "lead" ? "all" : "lead")}
            className={cn(
              "text-left rounded-xl border p-3 shadow-xs transition-all cursor-pointer",
              selectedLevel === "lead"
                ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-100/80 dark:bg-amber-900/40"
                : "border-amber-200/80 bg-amber-50/60 dark:bg-amber-500/10 dark:border-amber-500/20 hover:border-amber-400"
            )}
          >
            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              <Zap className="w-3.5 h-3.5" />
              <span>Leads</span>
            </div>
            <div className="text-xl font-bold text-amber-800 dark:text-amber-200 mt-0.5">
              {stats.leads}
            </div>
          </button>

          <button
            onClick={() => setSelectedLevel(selectedLevel === "senior" ? "all" : "senior")}
            className={cn(
              "text-left rounded-xl border p-3 shadow-xs transition-all cursor-pointer",
              selectedLevel === "senior"
                ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-100/80 dark:bg-blue-900/40"
                : "border-blue-200/80 bg-blue-50/60 dark:bg-blue-500/10 dark:border-blue-500/20 hover:border-blue-400"
            )}
          >
            <div className="flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">
              <Award className="w-3.5 h-3.5" />
              <span>Seniors</span>
            </div>
            <div className="text-xl font-bold text-blue-800 dark:text-blue-200 mt-0.5">
              {stats.seniors}
            </div>
          </button>

          <button
            onClick={() => setSelectedLevel(selectedLevel === "junior" ? "all" : "junior")}
            className={cn(
              "text-left rounded-xl border p-3 shadow-xs transition-all cursor-pointer",
              selectedLevel === "junior"
                ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-100/80 dark:bg-emerald-900/40"
                : "border-emerald-200/80 bg-emerald-50/60 dark:bg-emerald-500/10 dark:border-emerald-500/20 hover:border-emerald-400"
            )}
          >
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Juniors</span>
            </div>
            <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">
              {stats.juniors}
            </div>
          </button>

          <button
            onClick={() => setSelectedLevel(selectedLevel === "hr" ? "all" : "hr")}
            className={cn(
              "text-left rounded-xl border p-3 shadow-xs transition-all cursor-pointer",
              selectedLevel === "hr"
                ? "border-rose-500 ring-2 ring-rose-500/30 bg-rose-100/80 dark:bg-rose-900/40"
                : "border-rose-200/80 bg-rose-50/60 dark:bg-rose-500/10 dark:border-rose-500/20 hover:border-rose-400"
            )}
          >
            <div className="flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
              <UserCheck className="w-3.5 h-3.5" />
              <span>HR & People</span>
            </div>
            <div className="text-xl font-bold text-rose-800 dark:text-rose-200 mt-0.5">
              {stats.hr}
            </div>
          </button>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="bg-card p-3 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter tree by employee name, email, designation, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-muted/40 rounded-xl text-sm border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 bg-muted/40 rounded-xl text-xs font-medium border border-border/80 text-foreground focus:outline-none w-full sm:w-auto"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Level Tier Filter */}
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 bg-muted/40 rounded-xl text-xs font-medium border border-border/80 text-foreground focus:outline-none w-full sm:w-auto"
            >
              <option value="all">All Hierarchy Levels</option>
              {HIERARCHY_LEVELS.map((lvl) => (
                <option key={lvl.key} value={lvl.key}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tree-specific controls */}
          <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0 border-l border-border/80 pl-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExpandAll}
              className="h-8 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Expand all tree branches"
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Expand All</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCollapseAll}
              className="h-8 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Collapse all tree branches"
            >
              <ChevronsDownUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Collapse All</span>
            </Button>
          </div>
        </div>

        {/* Filter Indicator & Reset */}
        {isFilterActive && (
          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span>
                Tree filtered: showing{" "}
                <strong className="text-foreground">{filteredEmployees.length}</strong> of{" "}
                <strong className="text-foreground">{employees.length}</strong> members
                {selectedDept !== "all" && ` · Dept: ${selectedDept}`}
                {selectedLevel !== "all" &&
                  ` · Level: ${HIERARCHY_MAP.get(selectedLevel as HierarchyLevel)?.shortLabel || selectedLevel}`}
                {search && ` · Query: "${search}"`}
              </span>
            </div>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-24 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Building organizational tree...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW 1: Visual Org Chart (Top-Down Diagram Tree with Drag-to-Pan) */}
      {!loading && !error && viewMode === "chart" && (
        <div className="relative rounded-2xl border border-border bg-card/60 backdrop-blur shadow-xs h-[calc(100vh-220px)] min-h-[640px] overflow-hidden flex flex-col">
          {/* Zoom and View Controls Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/80 bg-muted/20 z-10 shrink-0">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-medium">
              <GitFork className="w-4 h-4 text-primary" />
              <span>Interactive Organization Chart</span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                <Hand className="w-3 h-3" />
                <span>Click & drag anywhere to pan left, right, up, down</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={centerView}
                className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Center view on CEO / Executive root"
              >
                <LocateFixed className="w-3.5 h-3.5 text-primary" />
                <span>Center View</span>
              </Button>

              <div className="h-4 w-px bg-border/80 mx-1" />

              <button
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold px-2 text-muted-foreground min-w-[46px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Reset zoom to 100%"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Org Chart Draggable Canvas */}
          <div
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            className={cn(
              "flex-1 overflow-auto p-12 relative overscroll-contain transition-colors",
              isPanning ? "cursor-grabbing select-none" : "cursor-grab"
            )}
          >
            {filteredTree.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-semibold text-foreground">No team members match this filter.</p>
                <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or department filter.</p>
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4 gap-1.5">
                  <FilterX className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
                </Button>
              </div>
            ) : (
              <div
                className="transition-transform duration-150 origin-top flex flex-col items-center min-w-max gap-12 select-none"
                style={{ transform: `scale(${zoom})` }}
              >
                {filteredTree.map((rootNode) => (
                  <OrgChartTreeNode
                    key={rootNode.id}
                    node={rootNode}
                    onEdit={openEditModal}
                    collapsedMap={collapsedMap}
                    onToggleCollapse={toggleCollapse}
                    searchFilter={search}
                    isFilterActive={isFilterActive}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Floating Navigation Pan HUD (D-Pad in Bottom Right) */}
          <div className="absolute bottom-5 right-5 z-20 flex flex-col items-center gap-1 bg-card/90 backdrop-blur-md p-1.5 rounded-2xl border border-border shadow-lg">
            <button
              onClick={() => panBy(0, -180)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Pan Up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => panBy(-220, 0)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Pan Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={centerView}
                className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                title="Center View on Root"
              >
                <LocateFixed className="w-4 h-4" />
              </button>
              <button
                onClick={() => panBy(220, 0)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Pan Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => panBy(0, 180)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Pan Down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: Collapsible Directory Tree View (Indented Tree) */}
      {!loading && !error && viewMode === "tree" && (
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-4 sm:p-6 overflow-x-auto shadow-xs min-h-[500px]">
          {filteredTree.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No hierarchy records match current filters.</p>
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4 gap-1.5">
                <FilterX className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTree.map((rootNode) => (
                <DirectoryTreeNode
                  key={rootNode.id}
                  node={rootNode}
                  level={0}
                  onEdit={openEditModal}
                  collapsedMap={collapsedMap}
                  onToggleCollapse={toggleCollapse}
                  searchFilter={search}
                  isFilterActive={isFilterActive}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: Matrix View (Grouped by Hierarchy Level) */}
      {!loading && !error && viewMode === "matrix" && (
        <div className="space-y-6">
          {filteredEmployees.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No employees match current filters.</p>
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4 gap-1.5">
                <FilterX className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </Button>
            </div>
          ) : (
            HIERARCHY_LEVELS.map((tier) => {
              const tierMembers = filteredEmployees.filter(
                (e) => e.hierarchyLevel === tier.key
              );

              if (tierMembers.length === 0) return null;

              return (
                <div
                  key={tier.key}
                  className="rounded-2xl border border-border bg-card/60 backdrop-blur overflow-hidden shadow-xs"
                >
                  {/* Tier Header */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-muted/30">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: tier.dotColor }}
                      />
                      <h3 className="font-semibold text-sm text-foreground">
                        {tier.label}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {tierMembers.length}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      Level {tier.order}
                    </span>
                  </div>

                  {/* Tier Member Grid */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {tierMembers.map((emp) => (
                      <div
                        key={emp.id}
                        className="group relative rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Top bar */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={emp.name} src={emp.avatar} size="md" bordered />
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-foreground truncate">
                                  <HighlightText text={emp.name} highlight={search} />
                                </h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  <HighlightText text={emp.designation} highlight={search} />
                                </p>
                              </div>
                            </div>

                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border shrink-0",
                                tier.badgeClass
                              )}
                            >
                              {LEVEL_ICONS[emp.hierarchyLevel]}
                              <span>{tier.shortLabel}</span>
                            </span>
                          </div>

                          {/* Meta info */}
                          <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border/50 pt-2.5">
                            <div className="flex items-center gap-2 truncate">
                              <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">
                                <HighlightText text={emp.department} highlight={search} />
                              </span>
                            </div>

                            <div className="flex items-center gap-2 truncate">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">
                                <HighlightText text={emp.email} highlight={search} />
                              </span>
                            </div>

                            {/* Reporting manager */}
                            <div className="flex items-center gap-2 pt-1">
                              <Briefcase className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-[11px] text-muted-foreground">
                                Reports to:{" "}
                                {emp.reportsTo ? (
                                  <span className="font-semibold text-foreground">
                                    {emp.reportsTo.name}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground italic">
                                    Top-level / Board
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {emp.directReportsCount > 0 ? (
                              <span className="text-primary font-semibold">
                                👥 {emp.directReportsCount} direct {emp.directReportsCount === 1 ? "report" : "reports"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">No direct reports</span>
                            )}
                          </span>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(emp)}
                            className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-primary cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Change</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* EDIT HIERARCHY MODAL */}
      {editEmployee && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-2xl animate-in zoom-in-95 duration-150">
              {/* Close Button */}
              <button
                onClick={closeEditModal}
                className="absolute right-4 top-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-border">
                <Avatar name={editEmployee.name} src={editEmployee.avatar} size="lg" bordered />
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Edit Reporting & Hierarchy
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {editEmployee.name} · {editEmployee.department}
                  </p>
                </div>
              </div>

              {saveMessage && (
                <div
                  className={cn(
                    "mb-4 p-3 rounded-xl text-xs flex items-center gap-2",
                    saveMessage.type === "success"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  )}
                >
                  {saveMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{saveMessage.text}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSaveHierarchy} className="space-y-4">
                {/* 1. Hierarchy Level Tier */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Hierarchy Level / Tier
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {HIERARCHY_LEVELS.map((tier) => (
                      <button
                        key={tier.key}
                        type="button"
                        onClick={() => setEditLevel(tier.key)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer",
                          editLevel === tier.key
                            ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted"
                        )}
                      >
                        <span style={{ color: tier.dotColor }}>{LEVEL_ICONS[tier.key]}</span>
                        <div className="truncate">
                          <div className="truncate font-medium">{tier.shortLabel}</div>
                          <div className="text-[10px] text-muted-foreground">
                            L{tier.order}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Direct Reporting Manager */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Direct Reporting Manager
                  </label>
                  <select
                    value={editManagerId}
                    onChange={(e) => setEditManagerId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-muted/40 rounded-xl text-sm border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">None (Top-Level Executive / Independent)</option>
                    {candidateManagers.map((mgr) => {
                      const tier = HIERARCHY_MAP.get(mgr.hierarchyLevel);
                      return (
                        <option key={mgr.id} value={mgr.id}>
                          {mgr.name} — {mgr.designation} ({tier?.shortLabel || mgr.role})
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Direct reports will flow under this manager in the organization tree.
                  </p>
                </div>

                {/* 3. Job Title Designation */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Job Designation
                  </label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder="e.g. Lead Software Engineer"
                    className="w-full px-3 py-2.5 bg-muted/40 rounded-xl text-sm border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeEditModal}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Saving..." : "Save Reporting Line"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

/**
 * 1. VISUAL ORG CHART TREE NODE (Top-Down Visual Diagram)
 */
function OrgChartTreeNode({
  node,
  onEdit,
  collapsedMap,
  onToggleCollapse,
  searchFilter,
  isFilterActive,
}: {
  node: FilteredTreeNode;
  onEdit: (emp: EmployeeItem) => void;
  collapsedMap: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  searchFilter: string;
  isFilterActive: boolean;
}) {
  const hasChildren = node.children && node.children.length > 0;
  // If filters are active, keep nodes expanded so matches are immediately visible
  const isCollapsed = isFilterActive ? false : !!collapsedMap[node.id];
  const tierConfig = HIERARCHY_MAP.get(node.hierarchyLevel);

  const isHighlighted = node.isDirectMatch && isFilterActive;
  const isAncestorPath = !node.isDirectMatch && node.hasMatchingDescendant && isFilterActive;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div
        className={cn(
          "relative group w-64 rounded-2xl border bg-card p-3.5 shadow-sm transition-all hover:shadow-md cursor-default select-text",
          isHighlighted && "ring-2 ring-primary border-primary bg-primary/[0.04]",
          isAncestorPath && "opacity-85 border-dashed border-border/90",
          !isHighlighted && !isAncestorPath && (tierConfig?.borderClass || "border-border")
        )}
      >
        {/* Tier colored top strip */}
        <div
          className="absolute top-0 left-4 right-4 h-1 rounded-b-full"
          style={{ backgroundColor: tierConfig?.dotColor || "#64748b" }}
        />

        {/* Card Header: Avatar, Name, Edit */}
        <div className="flex items-start justify-between gap-2 pt-1 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={node.name} src={node.avatar} size="md" bordered />
            <div className="min-w-0">
              <div className="font-semibold text-xs text-foreground truncate">
                <HighlightText text={node.name} highlight={searchFilter} />
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                <HighlightText text={node.designation} highlight={searchFilter} />
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(node)}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary cursor-pointer shrink-0"
            title="Edit reporting line"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
        </div>

        {/* Card Meta: Dept & Level Badge */}
        <div className="flex items-center justify-between gap-1 pt-2 border-t border-border/50 text-[10px]">
          <span className="text-muted-foreground truncate font-medium max-w-[130px]">
            <HighlightText text={node.department} highlight={searchFilter} />
          </span>

          {tierConfig && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold border shrink-0 text-[9px]",
                tierConfig.badgeClass
              )}
            >
              {LEVEL_ICONS[node.hierarchyLevel]}
              <span>{tierConfig.shortLabel}</span>
            </span>
          )}
        </div>

        {/* Card Bottom: Expand/Collapse Trigger Button */}
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={() => onToggleCollapse(node.id)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shadow-xs transition-transform hover:scale-105 cursor-pointer",
                isCollapsed
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-muted"
              )}
              title={isCollapsed ? "Expand team" : "Collapse team"}
            >
              {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{node.children.length}</span>
            </button>
          </div>
        )}
      </div>

      {/* Subtree Branches & Connectors */}
      {hasChildren && !isCollapsed && (
        <div className="flex flex-col items-center w-full">
          {/* Vertical Stem from parent card */}
          <div className="w-0.5 h-6 bg-border/80" />

          {/* Children row with horizontal connector */}
          <div className="flex justify-center items-start pt-0 relative">
            <div className="flex gap-6 items-start">
              {node.children.map((child, idx) => {
                const totalChildren = node.children.length;
                const isFirst = idx === 0;
                const isLast = idx === totalChildren - 1;

                return (
                  <div key={child.id} className="flex flex-col items-center relative">
                    {/* Horizontal connector segment */}
                    {totalChildren > 1 && (
                      <div
                        className={cn(
                          "absolute top-0 h-0.5 bg-border/80",
                          isFirst && "left-1/2 right-0",
                          isLast && "left-0 right-1/2",
                          !isFirst && !isLast && "left-0 right-0"
                        )}
                      />
                    )}

                    {/* Vertical stem into child card */}
                    <div className="w-0.5 h-6 bg-border/80" />

                    <OrgChartTreeNode
                      node={child}
                      onEdit={onEdit}
                      collapsedMap={collapsedMap}
                      onToggleCollapse={onToggleCollapse}
                      searchFilter={searchFilter}
                      isFilterActive={isFilterActive}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 2. COLLAPSIBLE DIRECTORY TREE NODE (Indented Branch Tree)
 */
function DirectoryTreeNode({
  node,
  level,
  onEdit,
  collapsedMap,
  onToggleCollapse,
  searchFilter,
  isFilterActive,
}: {
  node: FilteredTreeNode;
  level: number;
  onEdit: (emp: EmployeeItem) => void;
  collapsedMap: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  searchFilter: string;
  isFilterActive: boolean;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = isFilterActive ? false : !!collapsedMap[node.id];
  const tierConfig = HIERARCHY_MAP.get(node.hierarchyLevel);

  const isHighlighted = node.isDirectMatch && isFilterActive;
  const isAncestorPath = !node.isDirectMatch && node.hasMatchingDescendant && isFilterActive;

  return (
    <div className="relative pl-6 border-l-2 border-border/80 transition-all">
      {/* Horizontal Connector Stem */}
      <span
        aria-hidden
        className="absolute -left-[2px] top-5 w-5 h-0.5 bg-border/80"
      />

      {/* Node Card Row */}
      <div
        className={cn(
          "inline-flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card transition-all mb-2.5 max-w-2xl w-full shadow-xs hover:border-primary/40 cursor-default select-text",
          isHighlighted && "ring-2 ring-primary border-primary bg-primary/[0.04]",
          isAncestorPath && "opacity-85 border-dashed border-border/90",
          !isHighlighted && !isAncestorPath && (tierConfig?.borderClass || "border-border")
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={node.name} src={node.avatar} size="md" bordered />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate">
                <HighlightText text={node.name} highlight={searchFilter} />
              </span>

              {tierConfig && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border shrink-0",
                    tierConfig.badgeClass
                  )}
                >
                  {LEVEL_ICONS[node.hierarchyLevel]}
                  <span>{tierConfig.shortLabel}</span>
                </span>
              )}

              {isHighlighted && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary">
                  MATCH
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground truncate">
              <HighlightText text={node.designation} highlight={searchFilter} /> ·{" "}
              <span className="opacity-80">
                <HighlightText text={node.department} highlight={searchFilter} />
              </span>
            </p>
          </div>
        </div>

        {/* Children Toggle & Edit Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {hasChildren && (
            <button
              onClick={() => onToggleCollapse(node.id)}
              className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title={isCollapsed ? "Expand team" : "Collapse team"}
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{node.children.length} reports</span>
            </button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(node)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary cursor-pointer"
            title="Edit reporting line"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Children branches */}
      {hasChildren && !isCollapsed && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <DirectoryTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              collapsedMap={collapsedMap}
              onToggleCollapse={onToggleCollapse}
              searchFilter={searchFilter}
              isFilterActive={isFilterActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
