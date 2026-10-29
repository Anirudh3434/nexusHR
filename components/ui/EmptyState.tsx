import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Tighter spacing for table cells, sidebars, and popovers. */
  compact?: boolean;
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
  compact = false,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex items-start gap-3.5 text-left",
      compact ? "px-4 py-4" : "px-5 py-6",
      className
    )}
    role="status"
    aria-live="polite"
  >
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary",
        compact
          ? "h-9 w-9 [&>svg]:h-4 [&>svg]:w-4"
          : "h-11 w-11 [&>svg]:h-[18px] [&>svg]:w-[18px]"
      )}
    >
      {icon ?? <Inbox />}
    </div>

    <div className={cn("min-w-0 flex-1", compact ? "py-0" : "py-0.5")}>
      <p className={cn("font-semibold text-foreground", compact ? "text-[13px]" : "text-sm")}>
        {title}
      </p>
      {description && (
        <p
          className={cn(
            "mt-1 max-w-md leading-relaxed text-muted-foreground",
            compact ? "text-xs" : "text-[13px]"
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  </div>
);
