"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Megaphone, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  ArrowUpRight, 
  ChevronRight, 
  X, 
  User, 
  Tag, 
  ShieldAlert,
  PartyPopper,
  FileText,
  CalendarCheck
} from "lucide-react";
import { Notice } from "../../services/noticeService";
import { cn } from "../../lib/utils";

interface NoticeBoardWidgetProps {
  notices: Notice[];
  isLoading?: boolean;
  isAdminOrHr?: boolean;
  className?: string;
}

const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'Urgent':
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
        card: 'border-l-4 border-l-rose-500',
        icon: ShieldAlert
      };
    case 'Policy':
      return {
        badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
        card: 'border-l-4 border-l-blue-500',
        icon: FileText
      };
    case 'Holiday':
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
        card: 'border-l-4 border-l-emerald-500',
        icon: CalendarCheck
      };
    case 'Event':
      return {
        badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30',
        card: 'border-l-4 border-l-purple-500',
        icon: PartyPopper
      };
    default:
      return {
        badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        card: 'border-l-4 border-l-slate-400',
        icon: Megaphone
      };
  }
};

const getPriorityBadge = (priority: string) => {
  if (priority === 'High') {
    return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30';
  }
  if (priority === 'Medium') {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30';
  }
  return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const NoticeBoardWidget: React.FC<NoticeBoardWidgetProps> = ({
  notices = [],
  isLoading = false,
  isAdminOrHr = false,
  className
}) => {
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Filter notices
  const filteredNotices = selectedCategory === 'All'
    ? notices
    : notices.filter(n => n.category === selectedCategory);

  // Categories present in the dataset
  const availableCategories = ['All', ...Array.from(new Set(notices.map(n => n.category)))];

  // Most recent urgent/high notice for headline ticker
  const urgentNotice = notices.find(n => n.priority === 'High' || n.category === 'Urgent');

  return (
    <>
      <div className={cn(
        "rounded-[14px] border border-border bg-card text-card-foreground shadow-xs overflow-hidden transition-all",
        className
      )}>
        {/* Header */}
        <div className="p-5 border-b border-border/60 flex items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                  Notice Board
                </h3>
                {notices.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    {notices.length} {notices.length === 1 ? 'Notice' : 'Notices'}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground">
                Official company announcements & updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdminOrHr && (
              <Link
                href="/notices"
                className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-primary/5"
              >
                <span>Manage</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* High Priority Highlight Bar if available */}
        {urgentNotice && (
          <div 
            onClick={() => setSelectedNotice(urgentNotice)}
            className="px-5 py-2.5 bg-rose-50 dark:bg-rose-500/10 border-b border-rose-200/80 dark:border-rose-500/20 flex items-center justify-between gap-3 cursor-pointer hover:bg-rose-100/70 dark:hover:bg-rose-500/15 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 shrink-0">
                Priority Notice:
              </span>
              <span className="text-xs font-semibold text-rose-900 dark:text-rose-200 truncate">
                {urgentNotice.title}
              </span>
            </div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 shrink-0 hover:underline">
              Read <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        )}

        {/* Category Filter Pills (if multiple categories) */}
        {availableCategories.length > 2 && (
          <div className="px-5 pt-3 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-border/40">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0",
                  selectedCategory === cat
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Notice Items List */}
        <div className="p-5">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl border border-border/60 bg-muted/30 animate-pulse space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted/60 rounded" />
                  <div className="h-3 w-1/2 bg-muted/40 rounded" />
                </div>
              ))}
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <Megaphone className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs font-medium">
                {selectedCategory === 'All' 
                  ? "No company notices posted right now." 
                  : `No notices under the "${selectedCategory}" category.`}
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                You're all caught up with company announcements!
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredNotices.map((notice) => {
                const style = getCategoryStyles(notice.category);
                const IconComponent = style.icon;

                return (
                  <div
                    key={notice.id}
                    onClick={() => setSelectedNotice(notice)}
                    className={cn(
                      "p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 hover:border-border transition-all cursor-pointer group shadow-2xs",
                      style.card
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", style.badge)}>
                            {notice.category}
                          </span>
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", getPriorityBadge(notice.priority))}>
                            {notice.priority}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                            <Clock className="w-3 h-3 text-muted-foreground/70" />
                            {formatDate(notice.createdAt)}
                          </span>
                        </div>

                        <h4 className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {notice.title}
                        </h4>

                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-normal">
                          {notice.content}
                        </p>

                        <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground/80">
                          <span>By {notice.postedBy?.name || 'Operations'}</span>
                          <span className="text-primary font-medium group-hover:underline flex items-center gap-0.5">
                            Read notice <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Notice Reader Dialog / Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-card text-card-foreground border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl relative max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
              <div className="space-y-1.5 min-w-0 pr-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", getCategoryStyles(selectedNotice.category).badge)}>
                    {selectedNotice.category}
                  </span>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-semibold border", getPriorityBadge(selectedNotice.priority))}>
                    {selectedNotice.priority} Priority
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground leading-snug">
                  {selectedNotice.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Notice Content */}
            <div className="py-5 overflow-y-auto flex-1 space-y-4 pr-1 scrollbar-thin">
              <div className="text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed font-normal bg-muted/20 p-4 rounded-xl border border-border/50">
                {selectedNotice.content}
              </div>

              {/* Meta details */}
              <div className="bg-muted/40 rounded-xl p-3.5 space-y-2 border border-border/60 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>Posted by:</span>
                  </span>
                  <strong className="text-foreground">
                    {selectedNotice.postedBy?.name || 'Administrator'} {selectedNotice.postedBy?.role ? `(${selectedNotice.postedBy.role})` : ''}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                    <span>Posted on:</span>
                  </span>
                  <span className="text-foreground font-medium">
                    {formatDate(selectedNotice.createdAt)}
                  </span>
                </div>

                {selectedNotice.expiryDate && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Valid until:</span>
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 font-medium">
                      {formatDate(selectedNotice.expiryDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                NexusHR Announcements
              </span>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-2 text-xs font-semibold bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default NoticeBoardWidget;
