import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60 dark:bg-muted/40", className)}
      {...props}
    />
  );
}

/** Full dashboard shell skeleton for app/(dashboard)/layout.tsx */
export function DashboardShellSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar Skeleton */}
      <div className="hidden md:flex w-64 flex-col border-r border-border bg-card p-4 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        <div className="space-y-2 pt-4">
          <Skeleton className="h-3 w-20 px-2" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2.5 rounded-lg">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Area Skeleton */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar Skeleton */}
        <div className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
          <Skeleton className="h-9 w-36 sm:w-64 rounded-lg" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="hidden sm:block h-8 w-24 rounded-full" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 sm:h-7 w-36 sm:w-48" />
              <Skeleton className="h-3.5 sm:h-4 w-48 sm:w-72" />
            </div>
            <Skeleton className="h-8 sm:h-9 w-24 sm:w-28 rounded-lg" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-2.5 sm:space-y-3">
                <Skeleton className="h-3.5 sm:h-4 w-20 sm:w-24" />
                <Skeleton className="h-6 sm:h-8 w-14 sm:w-16" />
                <Skeleton className="h-3 w-24 sm:w-32" />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2 border-b border-border/50">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Project board / Kanban view skeleton */
export function BoardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <div className="h-5 w-px bg-border" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* View Tabs & Controls Skeleton */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Kanban Columns Skeleton */}
      <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4 overflow-x-auto pb-4 scrollbar-none">
        {Array.from({ length: 4 }).map((_, colIndex) => (
          <div
            key={colIndex}
            className="w-[85vw] sm:w-auto shrink-0 sm:shrink rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-3 min-h-[450px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1 py-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>

            {/* Task Card Skeletons */}
            {Array.from({ length: 3 - (colIndex % 2) }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-12 rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table list skeleton */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header / Search Controls */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table Head */}
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-6 py-3.5">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-4 px-6 py-4">
              {Array.from({ length: cols }).map((_, c) => (
                <div key={c} className="flex-1 flex items-center gap-2">
                  {c === 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
                  <Skeleton className={`h-4 ${c === 0 ? 'w-32' : 'w-24'}`} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

