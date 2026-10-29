"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Cake,
  CalendarDays,
  FileText,
  LifeBuoy,
  ListChecks,
  LogOut,
  Megaphone,
  PartyPopper,
  Receipt,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import {
  buildCelebrations,
  notificationToCelebration,
  type Celebration,
  type CelebrationKind,
  type FeedNotification,
} from "@/lib/celebrations";
import { cn } from "@/lib/utils";

/** Shown once per browser session, right after the user signs in. */
const STORAGE_KEY = "nexus-celebration-seen";

const KIND_ICON: Record<CelebrationKind, React.ReactNode> = {
  birthday: <Cake size={30} strokeWidth={1.8} />,
  anniversary: <Sparkles size={30} strokeWidth={1.8} />,
  probation: <BadgeCheck size={30} strokeWidth={1.8} />,
  notice: <LogOut size={30} strokeWidth={1.8} />,
  welcome: <PartyPopper size={30} strokeWidth={1.8} />,
  announcement: <Megaphone size={30} strokeWidth={1.8} />,
  leave: <CalendarDays size={30} strokeWidth={1.8} />,
  resignation: <FileText size={30} strokeWidth={1.8} />,
  ticket: <LifeBuoy size={30} strokeWidth={1.8} />,
  task: <ListChecks size={30} strokeWidth={1.8} />,
  payroll: <Wallet size={30} strokeWidth={1.8} />,
  expense: <Receipt size={30} strokeWidth={1.8} />,
  system: <Bell size={30} strokeWidth={1.8} />,
};

const KIND_LABEL: Record<CelebrationKind, string> = {
  birthday: "Birthday",
  anniversary: "Work anniversary",
  probation: "Probation",
  notice: "Notice period",
  welcome: "Welcome",
  announcement: "Announcement",
  leave: "Leave",
  resignation: "Resignation",
  ticket: "Ticket",
  task: "Task assigned",
  payroll: "Payroll",
  expense: "Expense",
  system: "Update",
};

const MILESTONE_KINDS: CelebrationKind[] = [
  "birthday",
  "anniversary",
  "probation",
  "notice",
  "welcome",
];

const CONFETTI_TONES = [
  "var(--primary)",
  "color-mix(in oklab, var(--primary) 55%, transparent)",
  "#fbbf24",
  "color-mix(in oklab, #34d399 70%, transparent)",
];

/** One soft light behind the medallion, themed off the company primary. */
const MEDALLION_GRADIENT =
  "linear-gradient(160deg, color-mix(in oklab, var(--primary) 74%, white) 0%, var(--primary) 52%, color-mix(in oklab, var(--primary) 76%, black) 100%)";

/**
 * Full-screen confetti burst. Deterministic positions keep server and client
 * markup identical; the whole layer is aria-hidden and pointer-transparent.
 */
function Confetti({ pieces = 36 }: { pieces?: number }) {
  const reduceMotion = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, index) => ({
        left: (index * 89) % 100,
        delay: ((index * 137) % 1100) / 1000,
        duration: 3.2 + ((index * 53) % 140) / 100,
        drift: (index % 2 === 0 ? 1 : -1) * (24 + ((index * 31) % 96)),
        spin: (index % 2 === 0 ? 1 : -1) * (240 + ((index * 71) % 420)),
        width: 5 + (index % 4),
        height: 9 + (index % 7),
        tone: CONFETTI_TONES[index % CONFETTI_TONES.length],
      })),
    [pieces]
  );

  if (reduceMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {bits.map((bit, index) => (
        <motion.span
          key={index}
          className="absolute top-0 rounded-[2px]"
          style={{
            left: `${bit.left}%`,
            width: bit.width,
            height: bit.height,
            background: bit.tone,
          }}
          initial={{ opacity: 0, y: -30, x: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: "105vh",
            x: bit.drift,
            rotate: bit.spin,
          }}
          transition={{
            duration: bit.duration,
            delay: bit.delay,
            ease: [0.25, 0.6, 0.35, 1],
            times: [0, 0.08, 0.85, 1],
          }}
        />
      ))}
    </div>
  );
}

/** Quiet decorative sparks orbiting the medallion. */
function Sparks() {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[
        { x: "-26%", y: "12%", size: 5, delay: 0 },
        { x: "108%", y: "34%", size: 4, delay: 0.5 },
        { x: "-14%", y: "76%", size: 3, delay: 0.9 },
        { x: "96%", y: "84%", size: 5, delay: 0.3 },
      ].map((spark, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full bg-primary"
          style={{
            left: spark.x,
            top: spark.y,
            width: spark.size,
            height: spark.size,
          }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1, 0.6] }}
          transition={{
            duration: 2.6,
            delay: spark.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const slideVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 28 : -28,
    scale: 0.985,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -24 : 24,
    scale: 0.985,
    transition: { duration: 0.16, ease: "easeIn" },
  }),
};

const fadeVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * after signing in: birthday, work anniversary, probation completion and the
 * end of a notice period. Each milestone takes the stage on its own, in turn.
 * On quiet days a welcome card is shown instead.
 */
export function LoginCelebration() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState<Celebration[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const active = items[index];
  const isLast = index >= items.length - 1;
  const hasMilestone = items.some((item) => MILESTONE_KINDS.includes(item.kind));

  const goTo = useCallback(
    (next: number) => {
      setDirection(next > index ? 1 : -1);
      setIndex(next);
    },
    [index]
  );

  const goNext = useCallback(() => {
    if (isLast) {
      close();
      return;
    }
    setDirection(1);
    setIndex((current) => current + 1);
  }, [close, isLast]);

  const goPrev = useCallback(() => {
    if (index === 0) return;
    setDirection(-1);
    setIndex((current) => current - 1);
  }, [index]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const load = async () => {
      // `?celebrate=preview` shows every card, `?celebrate=birthday` a single
      // one — handy for checking the animation without waiting for the date.
      const previewKind =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("celebrate")
          : null;

      const firstName = (user.name || "").trim().split(/\s+/)[0] || "there";
      const welcome: Celebration = {
        id: "welcome",
        kind: "welcome",
        title: `Welcome back, ${firstName}`,
        message: `${greetingForHour(new Date().getHours())} — have a good one.`,
        meta: new Date().toLocaleDateString("en-GB", {
          weekday: "long",
          day: "2-digit",
          month: "short",
        }),
        href: "/dashboard",
      };

      const samples: Celebration[] = [
        {
          id: "birthday",
          kind: "birthday",
          title: `Happy birthday, ${firstName}!`,
          message: "Wishing you a brilliant year ahead.",
          meta: "Today",
          href: "/profile",
        },
        {
          id: "anniversary",
          kind: "anniversary",
          title: `4 years with ${user.companyName || "the team"}`,
          message: "Thank you for everything you have built here.",
          meta: "Since 2022",
          href: "/profile",
        },
        {
          id: "probation",
          kind: "probation",
          title: "Probation complete",
          message: "You are confirmed — welcome to the team for good.",
          meta: "Confirmed today",
          href: "/probation",
        },
        {
          id: "notice",
          kind: "notice",
          title: "Notice period complete",
          message: "Your last working day was 24 Oct.",
          meta: "Notice served",
          href: "/my-resignation",
        },
        {
          id: "leave",
          kind: "leave",
          title: "Priya Sharma requested leave",
          message: "Casual leave · 2 Nov → 4 Nov · 3 days.",
          meta: "Awaiting approval",
          href: "/leave-approvals",
        },
        {
          id: "payroll",
          kind: "payroll",
          title: "Your payslip is ready",
          message: "October 2026 · net pay ₹84,500.",
          meta: "Payroll",
          href: "/payslips",
        },
        {
          id: "announcement",
          kind: "announcement",
          title: "Diwali holiday announced",
          message: "The office stays closed 8–10 Nov. Enjoy the break!",
          meta: "Holiday · High",
          href: "/notices",
        },
      ];

      const show = (cards: Celebration[], feed: FeedNotification[] = []) => {
        if (cancelled) return;
        setItems(cards.length > 0 ? cards : [welcome]);
        setIndex(0);
        setReady(true);

        let alreadyCelebrated = false;
        try {
          alreadyCelebrated =
            sessionStorage.getItem(STORAGE_KEY) === new Date().toDateString();
          if (!alreadyCelebrated) {
            sessionStorage.setItem(STORAGE_KEY, new Date().toDateString());
          }
        } catch {
          /* storage blocked — show it anyway */
        }
        if (alreadyCelebrated) return;

        setOpen(true);

        // Mark the delivered cards so they are not announced again next login.
        if (feed.length > 0) {
          void fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: feed.map((item) => item.id), action: "seen" }),
          }).catch(() => {
            /* best effort */
          });
        }
      };

      if (previewKind) {
        show(
          previewKind === "preview"
            ? samples
            : samples.filter((sample) => sample.kind === previewKind)
        );
        return;
      }

      try {
        const [profileRes, resignationRes, notificationRes] = await Promise.all([
          fetch("/api/users/profile"),
          fetch("/api/resignations?myResignation=true"),
          fetch("/api/notifications?pending=true&limit=6"),
        ]);

        const profile = profileRes.ok ? await profileRes.json() : null;
        const resignationData = resignationRes.ok ? await resignationRes.json() : null;
        const notificationData = notificationRes.ok ? await notificationRes.json() : null;
        const feed: FeedNotification[] = notificationData?.notifications || [];

        const milestones = profile
          ? buildCelebrations({
              name: profile.name || user.name,
              companyName: user.companyName,
              dob: profile.dob,
              joiningDate: profile.joiningDate,
              probationStatus: profile.probationStatus,
              probationEndDate: profile.probationEndDate,
              probationConfirmedAt: profile.probationConfirmedAt,
              resignations: resignationData?.resignations || [],
            })
          : [];

        show(
          [...milestones, ...feed.map(notificationToCelebration)].slice(0, 12),
          feed
        );
      } catch (error) {
        console.error("Failed to load celebrations:", error);
        show([]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.name, user?.companyName]);

  // Scroll lock, keyboard paging, and focus while the overlay is up.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primaryRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close, goNext, goPrev]);

  return (
    <AnimatePresence>
      {open && ready && active && (
        <motion.div
          key="login-celebration"
          role="dialog"
          aria-modal="true"
          aria-labelledby="celebration-title"
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <button
            type="button"
            aria-label="Close celebrations"
            onClick={close}
            className="absolute inset-0 h-full w-full cursor-default bg-background/85 backdrop-blur-xl"
          />

          <Confetti key={active.id} pieces={active.kind === "welcome" ? 22 : 36} />

          <motion.div
            className="relative z-10 w-full max-w-lg"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            transition={
              reduceMotion
                ? { duration: 0.2 }
                : { type: "spring", stiffness: 220, damping: 26, delay: 0.05 }
            }
          >
            <div className="relative overflow-hidden rounded-[26px] border border-border bg-card shadow-2xl">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-28 -right-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
              />

              <button
                type="button"
                onClick={close}
                aria-label="Dismiss celebrations"
                className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={16} />
              </button>

              {/* Fixed-height stage keeps the card from jumping between slides. */}
              <div className="relative flex min-h-[430px] flex-col p-7 pt-9 sm:min-h-[452px] sm:p-10">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  {hasMilestone ? "Celebrations" : "What's new"}
                </p>

                <div className="relative flex flex-1 flex-col items-center justify-center py-6 text-center">
                  <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.div
                      key={active.id}
                      custom={direction}
                      variants={reduceMotion ? fadeVariants : slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={reduceMotion ? { duration: 0.12 } : undefined}
                      className="flex w-full flex-col items-center"
                    >
                      <div className="relative grid h-24 w-24 place-items-center">
                        <Sparks />
                        <motion.span
                          aria-hidden
                          className="absolute inset-0 rounded-full border border-primary/30"
                          animate={
                            reduceMotion
                              ? undefined
                              : { scale: [1, 1.22], opacity: [0.75, 0] }
                          }
                          transition={{
                            duration: 2.6,
                            repeat: Infinity,
                            ease: "easeOut",
                          }}
                        />
                        <span
                          aria-hidden
                          className="absolute inset-3 rounded-full bg-primary/25 blur-lg"
                        />
                        <span
                          aria-hidden
                          className="relative grid h-[76px] w-[76px] place-items-center rounded-full text-primary-foreground shadow-[0_12px_32px_-12px_color-mix(in_oklab,var(--primary)_70%,transparent)] ring-1 ring-white/20"
                          style={{ backgroundImage: MEDALLION_GRADIENT }}
                        >
                          {KIND_ICON[active.kind]}
                        </span>
                      </div>

                      <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {KIND_LABEL[active.kind]}
                      </p>

                      <h2
                        id="celebration-title"
                        className="mt-2 line-clamp-2 max-w-sm text-balance font-display text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[30px]"
                      >
                        {active.title}
                      </h2>

                      <p className="mt-3 line-clamp-2 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                        {active.message}
                      </p>

                      {active.meta && (
                        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                          {active.meta}
                        </span>
                      )}

                      {active.kind !== "welcome" && (
                        <Link
                          href={active.href}
                          onClick={close}
                          className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-primary transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          View details
                          <ArrowUpRight size={13} />
                        </Link>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="relative flex items-center justify-between gap-4 border-t border-border pt-5">
                  <div className="flex items-center gap-2">
                    {items.length > 1 ? (
                      <>
                        {items.map((item, itemIndex) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => goTo(itemIndex)}
                            aria-label={`Show ${KIND_LABEL[item.kind]}`}
                            aria-current={itemIndex === index}
                            className={cn(
                              "h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              itemIndex === index
                                ? "w-6 bg-primary"
                                : "w-1.5 bg-border hover:bg-muted-foreground/50"
                            )}
                          />
                        ))}
                        <span className="tabular ml-1 text-[11px] text-muted-foreground">
                          {index + 1} / {items.length}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        {KIND_LABEL[active.kind]}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={goPrev}
                        className="gap-1.5"
                      >
                        <ArrowLeft size={14} />
                        Back
                      </Button>
                    )}
                    <Button
                      ref={primaryRef}
                      size="sm"
                      onClick={goNext}
                      className="min-w-28 gap-1.5"
                    >
                      {isLast ? "Continue" : "Next"}
                      {!isLast && <ArrowRight size={14} />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
