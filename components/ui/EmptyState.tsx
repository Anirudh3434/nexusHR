import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Single empty-state used everywhere a list, table, or card has no rows.
 * Left-aligned like the rows it replaces — never centered — so the
 * fallback reads as part of the ledger instead of a floating poster.
 */
export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) => (
  <div className={cn("flex items-start gap-3.5 px-4 py-6 sm:px-5", className)} role="status">
    <div
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground"
    >
      {icon ?? <Inbox size={18} />}
    </div>
    <div className="min-w-0 py-0.5">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  </div>
);
