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
  size?: "default" | "sm";
  titleClassName?: string;
}

/**
 * Canonical dashboard page header.
 * Title: text-2xl bold tracking-tight (or text-base/text-lg when size="sm"). Subtitle: text-sm (or text-xs).
 * Icon: brand primary, aligned with the title on every screen.
 * Supports auto-truncation and slicing with hover tooltips for long titles.
 */
export function PageHeader({ 
  title, 
  icon, 
  description, 
  actions, 
  className,
  size = "default",
  titleClassName 
}: PageHeaderProps) {
  const isSm = size === "sm";

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0", className)}>
      <div className="min-w-0 max-w-full">
        <h1 className={cn(
          "flex items-center gap-2 font-bold tracking-tight text-foreground min-w-0",
          isSm ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
        )}>
          {icon ? (
            <span
              aria-hidden="true"
              className={cn(
                "flex shrink-0 items-center text-primary [&>svg]:text-primary",
                isSm ? "[&>svg]:h-5 [&>svg]:w-5" : "[&>svg]:h-6 [&>svg]:w-6"
              )}
            >
              {icon}
            </span>
          ) : null}
          <span 
            className={cn("min-w-0 truncate block", titleClassName)}
            title={typeof title === "string" ? title : undefined}
          >
            {title}
          </span>
        </h1>
        {description ? (
          <p className={cn(
            "text-muted-foreground break-words",
            isSm ? "mt-0.5 text-xs font-mono" : "mt-1 text-sm"
          )}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">{actions}</div> : null}
    </div>
  );
}
