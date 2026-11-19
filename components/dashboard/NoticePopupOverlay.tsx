"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Megaphone, 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  User, 
  ShieldAlert, 
  FileText, 
  CalendarCheck, 
  PartyPopper,
  EyeOff,
  Sparkles,
  FastForward
} from "lucide-react";
import { Notice, markNoticesAsRead } from "../../services/noticeService";
import { cn } from "../../lib/utils";

interface NoticePopupOverlayProps {
  notices: Notice[];
  userId?: string;
  onAllMarkedRead?: () => void;
}

// Reading time is derived from how much there is to read, not a fixed duration.
const WORDS_PER_MINUTE = 200; // average adult reading speed
const MIN_READ_SECONDS = 6; // floor so tiny notices still register as read
const MAX_READ_SECONDS = 300; // ceiling so huge notices don't lock the popup

const countWords = (text?: string) =>
  (text || "").trim().split(/\s+/).filter(Boolean).length;

/** Seconds of required reading for a notice, scaled by its title + content length. */
const getReadingSeconds = (notice?: Notice): number => {
  if (!notice) return MIN_READ_SECONDS;
  const words = countWords(notice.title) + countWords(notice.content);
  const seconds = Math.round((words / WORDS_PER_MINUTE) * 60);
  return Math.min(MAX_READ_SECONDS, Math.max(MIN_READ_SECONDS, seconds));
};

const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'Urgent':
      return {
        badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-300/40 dark:border-rose-500/30',
        dot: 'bg-rose-500',
        borderAccent: 'border-l-rose-500',
        icon: ShieldAlert
      };
    case 'Policy':
      return {
        badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-300/40 dark:border-blue-500/30',
        dot: 'bg-blue-500',
        borderAccent: 'border-l-blue-500',
        icon: FileText
      };
    case 'Holiday':
      return {
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-300/40 dark:border-emerald-500/30',
        dot: 'bg-emerald-500',
        borderAccent: 'border-l-emerald-500',
        icon: CalendarCheck
      };
    case 'Event':
      return {
        badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-300/40 dark:border-purple-500/30',
        dot: 'bg-purple-500',
        borderAccent: 'border-l-purple-500',
        icon: PartyPopper
      };
    default:
      return {
        badge: 'bg-primary/10 text-primary border-primary/25',
        dot: 'bg-primary',
        borderAccent: 'border-l-primary',
        icon: Megaphone
      };
  }
};

const getPriorityBadge = (priority: string) => {
  if (priority === 'High') {
    return {
      classes: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-300/40 dark:border-red-500/30 font-bold',
      dot: 'bg-red-500 animate-pulse'
    };
  }
  if (priority === 'Medium') {
    return {
      classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-300/40 dark:border-amber-500/30 font-semibold',
      dot: 'bg-amber-500'
    };
  }
  return {
    classes: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-300/40 dark:border-slate-500/30 font-medium',
    dot: 'bg-slate-400'
  };
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export const NoticePopupOverlay: React.FC<NoticePopupOverlayProps> = ({
  notices = [],
  userId,
  onAllMarkedRead
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [unreadList, setUnreadList] = useState<Notice[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState(MIN_READ_SECONDS);
  const [isMarking, setIsMarking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Storage key for locally cached read notices
  const storageKey = userId ? `read_notices_${userId}` : 'read_notices_guest';

  // Check which notices are unread whenever notices or userId change
  useEffect(() => {
    if (!notices || notices.length === 0) {
      setUnreadList([]);
      setIsOpen(false);
      return;
    }

    let localReadIds: string[] = [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        localReadIds = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse read notices from localStorage", e);
    }

    // Filter notices that have NOT been read in DB and NOT in localStorage
    const unread = notices.filter(n => !n.isRead && !localReadIds.includes(n.id));

    setUnreadList(unread);

    // If there are unread notices, automatically open popup overlay with a
    // reading timer sized to the first notice's content.
    // If all are marked as read, show nothing.
    if (unread.length > 0) {
      setIsOpen(true);
      setCurrentIndex(0);
      setSecondsRemaining(getReadingSeconds(unread[0]));
    } else {
      setIsOpen(false);
    }
  }, [notices, userId, storageKey]);

  // Content-based Countdown Timer (keeps ticking at 0 so it can resume on the next notice)
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Handle "See It Later" -> Closes overlay, keeps notices unread for next open
  const handleSeeLater = () => {
    setIsOpen(false);
  };

  // Handle "Mark as Read" (single or all)
  const handleMarkAsRead = async (noticeId?: string) => {
    setIsMarking(true);
    const targetIds = noticeId ? [noticeId] : unreadList.map(n => n.id);

    try {
      // 1. Persist to localStorage
      let localReadIds: string[] = [];
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) localReadIds = JSON.parse(stored);
      } catch {}

      const updatedLocalIds = Array.from(new Set([...localReadIds, ...targetIds]));
      localStorage.setItem(storageKey, JSON.stringify(updatedLocalIds));

      // 2. Persist to DB
      await markNoticesAsRead(targetIds);

      // 3. Update local state
      const remainingUnread = unreadList.filter(n => !targetIds.includes(n.id));
      setUnreadList(remainingUnread);

      if (remainingUnread.length === 0) {
        setIsOpen(false);
        if (onAllMarkedRead) onAllMarkedRead();
      } else {
        const nextIndex = Math.min(currentIndex, remainingUnread.length - 1);
        setCurrentIndex(nextIndex);
        // Reset timer to the next unread notice's content-based reading time
        setSecondsRemaining(getReadingSeconds(remainingUnread[nextIndex]));
      }
    } catch (err) {
      console.error("Failed to mark notice as read:", err);
    } finally {
      setIsMarking(false);
    }
  };

  const currentNotice = unreadList[currentIndex] || unreadList[0];

  // If closed or all marked as read, show nothing!
  if (!isOpen || unreadList.length === 0) {
    return null;
  }

  const style = getCategoryStyles(currentNotice.category);
  const priorityInfo = getPriorityBadge(currentNotice.priority);
  const IconComponent = style.icon;

  // Timer Calculations (per-notice total derived from content length)
  const totalReadSeconds = getReadingSeconds(currentNotice);
  const elapsedSeconds = Math.max(0, totalReadSeconds - secondsRemaining);
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalReadSeconds) * 100));
  const canMarkAsRead = secondsRemaining === 0;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      {/* High-Dopamine Glassmorphic MCP Container with Theme Primary Color Accents */}
      <div 
        className="relative w-full max-w-xl flex flex-col rounded-[32px] border border-white/60 dark:border-white/10 bg-gradient-to-b from-white/95 via-white/90 to-white/85 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-950/90 backdrop-blur-3xl shadow-[0_30px_90px_-20px_rgba(0,0,0,0.35),0_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8),0_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient blurred primary glow reflections */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/20 dark:bg-primary/30 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 -right-16 w-60 h-60 bg-primary/15 dark:bg-primary/20 rounded-full blur-[85px] pointer-events-none" />
        <div className="absolute -bottom-20 left-1/4 w-52 h-52 bg-primary/10 dark:bg-primary/15 rounded-full blur-[75px] pointer-events-none" />

        {/* Identity Glassmorphic Header - Pinned to top */}
        <div className="sticky top-0 z-20 px-6 py-4.5 border-b border-white/50 dark:border-white/10 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25 ring-4 ring-primary/15 shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                  Company Notice
                </h3>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
                Official announcement for all company team members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadList.length > 1 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold shadow-2xs">
                <span>Notice {currentIndex + 1} of {unreadList.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notice Scrollable Content Area */}
        <div className="p-6 sm:p-7 overflow-y-auto max-h-[58vh] space-y-5 scrollbar-thin z-10 relative">
          {/* Category & Priority Glass Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border backdrop-blur-md shadow-2xs", 
              style.badge
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
              <IconComponent className="w-3.5 h-3.5" />
              <span>{currentNotice.category}</span>
            </span>

            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] border backdrop-blur-md shadow-2xs", 
              priorityInfo.classes
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", priorityInfo.dot)} />
              <span>{currentNotice.priority} Priority</span>
            </span>

            {currentNotice.expiryDate && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold ml-auto flex items-center gap-1.5 bg-amber-50/80 dark:bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-200/60 dark:border-amber-500/20">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>Valid till {formatDate(currentNotice.expiryDate)}</span>
              </span>
            )}
          </div>

          {/* Notice Title */}
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug tracking-tight">
            {currentNotice.title}
          </h2>

          {/* Notice Content in Refined Glassmorphic Card */}
          <div className={cn(
            "p-5 sm:p-6 rounded-2xl border border-white/80 dark:border-white/10 bg-white/65 dark:bg-white/[0.03] backdrop-blur-md shadow-sm border-l-4 text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-normal",
            style.borderAccent
          )}>
            {currentNotice.content}
          </div>

          {/* Meta Info: Author & Date */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200/60 dark:border-slate-800 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground font-extrabold text-[10px] flex items-center justify-center shadow-2xs">
                {(currentNotice.postedBy?.name || 'HR').slice(0, 2).toUpperCase()}
              </div>
              <span className="font-medium">
                Posted by <strong className="text-slate-800 dark:text-slate-200 font-semibold">{currentNotice.postedBy?.name || 'Operations'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(currentNotice.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Glassmorphic Footer with Button-Integrated Progress Timer */}
        <div className="sticky bottom-0 z-20 px-6 py-4.5 border-t border-white/50 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shrink-0">
          {/* Multi-notice navigation if applicable */}
          {unreadList.length > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => {
                  const nextIndex = Math.max(0, currentIndex - 1);
                  setCurrentIndex(nextIndex);
                  setSecondsRemaining(getReadingSeconds(unreadList[nextIndex]));
                }}
                className="h-8 w-8 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95"
                title="Previous Notice"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Dot Indicators */}
              <div className="flex items-center gap-1 px-1">
                {unreadList.map((_, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      idx === currentIndex 
                        ? "w-4 bg-primary" 
                        : "w-1.5 bg-slate-300 dark:bg-slate-700"
                    )}
                  />
                ))}
              </div>

              <button
                type="button"
                disabled={currentIndex === unreadList.length - 1}
                onClick={() => {
                  const nextIndex = Math.min(unreadList.length - 1, currentIndex + 1);
                  setCurrentIndex(nextIndex);
                  setSecondsRemaining(getReadingSeconds(unreadList[nextIndex]));
                }}
                className="h-8 w-8 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95"
                title="Next Notice"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Please read announcement thoroughly</span>
            </div>
          )}

          {/* Actions: See It Later, Skip All, Mark as Read */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            {/* 1. See It Later */}
            <button
              type="button"
              onClick={handleSeeLater}
              className="px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white backdrop-blur-md transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>See It Later</span>
            </button>

            {/* 2. Skip All */}
            <button
              type="button"
              onClick={() => handleMarkAsRead()}
              disabled={isMarking}
              className="px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 hover:bg-primary/10 hover:border-primary/30 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary backdrop-blur-md transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <FastForward className="w-3.5 h-3.5 text-primary" />
              <span>Skip All</span>
            </button>

            {/* 3. Mark as Read: Disabled with Timer Progress Filling Background */}
            <button
              type="button"
              disabled={!canMarkAsRead || isMarking}
              onClick={() => handleMarkAsRead(currentNotice.id)}
              className={cn(
                "relative overflow-hidden px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center min-w-[205px] shadow-sm select-none",
                canMarkAsRead
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ring-2 ring-primary/30"
                  : "bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 cursor-not-allowed border border-primary/20 dark:border-primary/30"
              )}
            >
              {/* Progress Bar as Animated Background Color Fill with Illuminated Leading Edge */}
              {!canMarkAsRead && (
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/45 dark:from-primary/30 dark:via-primary/45 dark:to-primary/60 transition-all duration-1000 ease-linear rounded-l-xl"
                  style={{ width: `${progressPercent}%` }}
                >
                  {/* Glowing Vertical Leading Edge Indicator */}
                  <div className="absolute right-0 top-0 bottom-0 w-[2.5px] bg-primary shadow-[0_0_8px_2px_var(--primary)]" />
                </div>
              )}

              {/* Button Label and Countdown */}
              <span className="relative z-10 flex items-center gap-2">
                {canMarkAsRead ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    <span>Mark as Read</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Mark as Read <span className="font-mono font-bold text-primary ml-0.5">({timeFormatted})</span>
                    </span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticePopupOverlay;