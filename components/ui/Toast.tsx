"use client";

import { useToast } from "../../context/ToastContext";
import { cn } from "../../lib/utils";

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex w-80 items-start justify-between rounded-md border p-4 shadow-lg transition-all",
            {
              "bg-white border-gray-200 text-gray-900 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-50": toast.type === "info",
              "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-900 dark:text-green-300": toast.type === "success",
              "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300": toast.type === "error",
            }
          )}
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">{toast.title}</span>
            {toast.description && (
              <span className="text-sm opacity-90">{toast.description}</span>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-current opacity-70 hover:opacity-100 focus:outline-none"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};
