"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold text-slate-800 dark:text-slate-200",
        nav: "space-x-1 flex items-center",
        button_previous: "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors dark:hover:bg-slate-700",
        button_next: "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors dark:hover:bg-slate-700",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-slate-400 rounded-md w-9 font-medium text-[10px] uppercase tracking-wide",
        week: "flex w-full mt-1",
        day: cn(
          "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has([aria-selected])]:bg-indigo-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:bg-indigo-50 [&:has([aria-selected])]:rounded-md"
        ),
        day_button: cn(
          "h-9 w-9 p-0 font-normal text-slate-700 aria-selected:opacity-100 rounded-md dark:text-slate-300",
          "hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors dark:hover:bg-slate-700 dark:hover:text-slate-100"
        ),
        range_end: "day-range-end",
        selected: "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white focus:bg-indigo-600 focus:text-white rounded-md",
        today: "bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800 dark:text-slate-100",
        outside: "text-slate-300 opacity-50 aria-selected:bg-indigo-50 aria-selected:text-slate-400",
        disabled: "text-slate-300 opacity-50 cursor-not-allowed",
        range_middle: "aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-500/20 aria-selected:text-slate-700 dark:aria-selected:text-indigo-200 rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") return <ChevronLeft className="h-4 w-4" />;
          return <ChevronRight className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  );
}
