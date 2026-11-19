"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = "items",
  className,
}) => {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = Math.min((safeCurrentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1
  );

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground",
        className
      )}
    >
      {/* Range Display */}
      <div className="flex items-center gap-1.5 select-none">
        <span>
          Showing <span className="font-semibold text-foreground">{startItem}</span>–
          <span className="font-semibold text-foreground">{endItem}</span> of{" "}
          <span className="font-semibold text-foreground">{totalItems}</span> {itemLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 justify-between sm:justify-end">
        {/* Rows Per Page Dropdown (if handler provided) */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-8 px-2 py-0.5 rounded-lg border border-border bg-background text-foreground text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Navigation Buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
            disabled={safeCurrentPage <= 1}
            className="h-8 px-2 text-xs cursor-pointer disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
            <span>Prev</span>
          </Button>

          {pageNumbers.map((p, idx, arr) => {
            const prev = arr[idx - 1];
            const hasGap = prev && p - prev > 1;
            const isActive = p === safeCurrentPage;

            return (
              <React.Fragment key={p}>
                {hasGap && (
                  <span className="px-1.5 text-muted-foreground/50 select-none">...</span>
                )}
                <Button
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(p)}
                  className={cn(
                    "h-8 min-w-[32px] px-2 text-xs font-semibold cursor-pointer",
                    isActive ? "shadow-xs pointer-events-none" : "hover:bg-muted"
                  )}
                >
                  {p}
                </Button>
              </React.Fragment>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
            disabled={safeCurrentPage >= totalPages}
            className="h-8 px-2 text-xs cursor-pointer disabled:cursor-not-allowed"
            title="Next page"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
