import * as React from "react";
import { cn } from "../../lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Canonical dashboard page header.
 * Title: text-2xl semibold/bold tracking-tight. Subtitle: text-sm muted.
 * Layout: stacked on mobile, title-left/actions-right on sm+.
 * Page side padding comes from app/(dashboard)/layout.tsx — do not add padding classes here.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
