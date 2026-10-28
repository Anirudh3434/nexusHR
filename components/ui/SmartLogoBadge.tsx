"use client";

import React, { useState, useEffect } from "react";
import { detectImageBackgroundColor, getOptimizedImageUrl } from "@/lib/imageUtils";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartLogoBadgeProps {
  src?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  fallbackIcon?: React.ReactNode;
  fallbackBg?: string;
}

/**
 * SmartLogoBadge automatically analyzes the uploaded logo image,
 * determines its background color (e.g. white, black, custom color),
 * and fills the circular container with that exact color so the logo
 * blends 100% seamlessly with zero square edges or contrast clashes.
 */
export function SmartLogoBadge({
  src,
  alt = "Logo",
  className,
  imgClassName,
  fallbackIcon,
  fallbackBg,
}: SmartLogoBadgeProps) {
  const [detectedBg, setDetectedBg] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    if (!src) {
      setDetectedBg(null);
      return;
    }

    detectImageBackgroundColor(src).then((color) => {
      if (!isCancelled) {
        setDetectedBg(color);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [src]);

  // If no image source is provided, show fallback icon
  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400",
          className
        )}
        style={fallbackBg ? { backgroundColor: fallbackBg } : undefined}
      >
        {fallbackIcon || <Building2 className="h-1/2 w-1/2" />}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full overflow-hidden transition-colors duration-300",
        !detectedBg && (fallbackBg ? "" : "bg-white dark:bg-slate-800"),
        className
      )}
      style={{
        backgroundColor: detectedBg || fallbackBg || undefined,
      }}
    >
      <img
        src={getOptimizedImageUrl(src, 128, 128)}
        alt={alt}
        className={cn("h-full w-full object-contain", imgClassName)}
        loading="lazy"
      />
    </div>
  );
}
