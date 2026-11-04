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
  /** Text and layout alignment: defaults to "center" across the entire application. */
  align?: "center" | "left";
}

/**
 * Standard fallback / empty-state component used across all tables, lists, and card views.
 * Center-aligned by default with balanced vertical padding, centered icon container,
 * centered title and descriptive copy, and centered action buttons.
 */
export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className,
  compact = false,
  align = "center",
}: EmptyStateProps) => {
  const isCenter = align === "center";

  return (
    <div
      className={cn(
        "flex w-full",
        isCenter
          ? "flex-col items-center justify-center text-center mx-auto"
          : "items-start gap-3.5 text-left",
        compact ? "px-4 py-6" : "px-6 py-12",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-xs transition-transform duration-200 hover:scale-105",
          isCenter && "mb-3.5",
          compact
            ? "h-10 w-10 [&>svg]:h-4 [&>svg]:w-4"
            : "h-12 w-12 [&>svg]:h-5 [&>svg]:w-5"
        )}
      >
        {icon ?? <Inbox />}
      </div>

      <div
        className={cn(
          "min-w-0",
          isCenter ? "flex flex-col items-center max-w-md mx-auto" : "flex-1",
          compact ? "py-0" : "py-0.5"
        )}
      >
        <p
          className={cn(
            "font-semibold text-foreground tracking-tight",
            isCenter && "text-center",
            compact ? "text-[13px]" : "text-sm"
          )}
        >
          {title}
        </p>
        {description && (
          <p
            className={cn(
              "mt-1.5 leading-relaxed text-muted-foreground",
              isCenter ? "text-center max-w-md" : "max-w-md",
              compact ? "text-xs" : "text-[13px]"
            )}
          >
            {description}
          </p>
        )}
        {action && (
          <div
            className={cn(
              "mt-4 flex flex-wrap items-center gap-2.5",
              isCenter && "justify-center"
            )}
          >
            {action}
          </div>
        )}
      </div>
    </div>
  );
};
