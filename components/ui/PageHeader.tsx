import * as React from "react";
import { cn } from "../../lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  /**
   * Screen icon. Rendered at a fixed size and brand colour so every page
   * header looks identical. Pass the bare lucide icon, e.g. `<Clock />`.
   */
  icon?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Canonical dashboard page header.
 * Title: text-2xl bold tracking-tight. Subtitle: text-sm muted.
 * Icon: 24px, brand primary, aligned with the title on every screen.
 * Layout: stacked on mobile, title-left/actions-right on sm+.
 * Page side padding comes from app/(dashboard)/layout.tsx — do not add padding classes here.
 */
export function PageHeader({ title, icon, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
          {icon ? (
            <span
              aria-hidden="true"
              className="flex shrink-0 items-center text-primary [&>svg]:h-6 [&>svg]:w-6 [&>svg]:text-primary"
            >
              {icon}
            </span>
          ) : null}
          <span className="min-w-0">{title}</span>
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
