"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  CalendarDays,
  FileText,
  LifeBuoy,
  ListChecks,
  Wallet,
  Receipt,
  Megaphone,
  CheckCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  kind:
    | "leave"
    | "resignation"
    | "ticket"
    | "task"
    | "payroll"
    | "expense"
    | "announcement"
    | "system";
  title: string;
  message: string;
  href: string;
  meta: string | null;
  actorName: string | null;
  createdAt: string;
  readAt: string | null;
}

const KIND_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  leave: {
    icon: <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  resignation: {
    icon: <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
  ticket: {
    icon: <LifeBuoy className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  task: {
    icon: <ListChecks className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
  },
  payroll: {
    icon: <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  expense: {
    icon: <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/10 border-teal-500/20",
  },
  announcement: {
    icon: <Megaphone className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
  system: {
    icon: <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-500/10 border-slate-500/20",
  },
};

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(typeof data.unread === "number" ? data.unread : 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    const handleFocus = () => fetchNotifications();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchNotifications]);

  // Click outside and ESC handlers
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleMarkAllAsRead = async () => {
    // Optimistic
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read" }),
      });
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    // Mark as read if not already read
    if (!item.readAt) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id], action: "read" }),
      }).catch(() => {});
    }

    setOpen(false);
    if (item.href) {
      router.push(item.href);
    }
  };

  const filteredNotifications =
    tab === "unread"
      ? notifications.filter((n) => !n.readAt)
      : notifications;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) fetchNotifications();
        }}
        aria-label="View notifications"
        aria-expanded={open}
        className={cn(
          "relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none transition-colors",
          open && "bg-muted text-foreground"
        )}
      >
        <Bell className="w-[18px] h-[18px]" />

        {unreadCount > 0 && (
          <>
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="sr-only">{unreadCount} unread notifications</span>
          </>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-[360px] sm:w-[420px] rounded-2xl border border-border bg-card text-card-foreground shadow-2xl backdrop-blur-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors py-1 px-2 rounded-md hover:bg-muted"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-border/60 px-4 pt-2 gap-2 bg-muted/10">
            <button
              onClick={() => setTab("all")}
              className={cn(
                "pb-2 text-xs font-medium border-b-2 transition-colors",
                tab === "all"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setTab("unread")}
              className={cn(
                "pb-2 text-xs font-medium border-b-2 transition-colors",
                tab === "unread"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40 overscroll-contain">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted/70 border border-border/60 flex items-center justify-center text-muted-foreground mb-3">
                  {tab === "unread" ? (
                    <CheckCheck className="w-5 h-5 text-primary" strokeWidth={1.75} />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {tab === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tab === "unread"
                    ? "You're all caught up with your updates."
                    : "Important activity regarding leaves, tasks, payroll, and notices will appear here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const conf = KIND_CONFIG[item.kind] || KIND_CONFIG.system;
                const isUnread = !item.readAt;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleItemClick(item);
                      }
                    }}
                    className={cn(
                      "group flex items-start gap-3 p-3.5 hover:bg-muted/50 cursor-pointer transition-colors text-left relative",
                      isUnread && "bg-primary/[0.03]"
                    )}
                  >
                    {/* Unread indicator bar */}
                    {isUnread && (
                      <span className="absolute left-1 top-4 bottom-4 w-1 rounded-full bg-primary" />
                    )}

                    {/* Icon */}
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                        conf.bg
                      )}
                    >
                      {conf.icon}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        <p
                          className={cn(
                            "text-xs text-foreground truncate pr-2",
                            isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                          )}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>

                      {item.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1.5">
                        {item.meta && (
                          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {item.meta}
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-auto">
                          View details <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

