"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CreditCard,
  Check,
  Loader2,
  Clock,
  ShieldCheck,
  Sparkles,
  LayoutGrid,
  Users,
  Wand2,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionState } from "@/lib/subscription";
import { FEATURE_LABELS, isFeature, type Feature } from "@/lib/entitlements";

type Cycle = "annual" | "monthly";

type Plan = {
  id: string;
  name: string;
  tagline: string;
  annual: number | null;
  monthly: number | null;
  badge?: string;
  highlight?: boolean;
  activatable: boolean;
  cta: string;
  includes?: string;
  features: string[];
};

// Per-employee / month. Annual is the headline rate (billed yearly, save 20%);
// monthly is the flexible rate. Every step is self-justifying so the premium
// over pure-HRMS competitors is visible on the page itself.
const HR_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Core HR for small teams getting organised.",
    annual: 79,
    monthly: 99,
    activatable: true,
    cta: "Subscribe",
    features: [
      "Employee directory & profiles",
      "Attendance — geo-fence, WFH, shifts, overtime",
      "Leave, holidays & approvals",
      "Onboarding, documents & e-sign",
      "Expenses & reimbursements",
      "Reports & analytics",
      "Careers page",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Run payroll and people ops end-to-end.",
    annual: 119,
    monthly: 149,
    badge: "Most popular",
    highlight: true,
    activatable: true,
    cta: "Subscribe",
    includes: "Includes 3 PMS seats · 2 AI seats",
    features: [
      "Everything in Starter",
      "Payroll + statutory — PF, ESI, TDS, PT",
      "Payslips, reimbursements & compliance",
      "Helpdesk tickets & surveys",
      "Notices, announcements & templates",
      "3 PMS seats · 2 AI seats included",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Scale with control and customization.",
    annual: 159,
    monthly: 199,
    activatable: true,
    cta: "Subscribe",
    includes: "Includes 10 PMS seats · 5 AI seats",
    features: [
      "Everything in Growth",
      "Recruitment ATS + careers portal + inbox sync",
      "Roles & permissions with per-user overrides",
      "White-label branding, careers & templates",
      "SSO & audit logs",
      "API & webhooks",
      "10 PMS seats · 5 AI seats included",
    ],
  },
];

const BUNDLE: Plan = {
  id: "complete",
  name: "Complete",
  tagline: "HRM + Projects + AI in one platform — replace two or three vendors.",
  annual: 199,
  monthly: 249,
  badge: "Best value",
  activatable: true,
  cta: "Subscribe",
  includes: "Org-wide PMS & AI · 500 AI credits / month",
  features: [
    "Everything in Business",
    "Org-wide PMS — unlimited project seats",
    "Org-wide AI — fair-use for every employee",
    "500 AI credits / month for agentic & voice jobs",
    "Save ~31% vs buying the modules separately",
    "Dedicated onboarding",
  ],
};

const ADDONS = [
  {
    icon: LayoutGrid,
    name: "PMS seats",
    price: "₹49",
    priceMonthly: "₹69",
    unit: "per active project seat / month",
    blurb: "Beyond your plan's included seats. Read-only viewers are always free.",
  },
  {
    icon: Wand2,
    name: "AI seats",
    price: "₹49",
    priceMonthly: "₹69",
    unit: "per AI-active seat / month",
    blurb: "Give NexusAI to the people who use it. Assigned seats, monthly true-up.",
  },
  {
    icon: Sparkles,
    name: "AI credits",
    price: "₹499",
    priceMonthly: "₹499",
    unit: "per 1,000 credits",
    blurb: "Heavy agentic jobs — NL queries, voice, report builder, retention runs. 12-month validity.",
  },
];

export default function BillingPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [status, setStatus] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [cycle, setCycle] = useState<Cycle>("annual");
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);

  const isAdmin = user?.role === "admin" || (user?.role as string) === "super_admin";

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/subscription/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("upgrade");
    if (param && isFeature(param)) setUpgradeFeature(param);
  }, []);

  const activate = async (plan: string) => {
    setActivating(plan);
    try {
      const res = await fetch("/api/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast({ type: "error", title: "Activation failed", description: data.message || "Try again" });
        return;
      }
      addToast({ type: "success", title: "Subscribed", description: `Workspace is now on ${plan}` });
      router.push("/dashboard");
    } catch {
      addToast({ type: "error", title: "Network error", description: "Could not reach billing" });
    } finally {
      setActivating(null);
    }
  };

  if (loading || !status) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading billing" />
      </div>
    );
  }

  const expired = status.status === "expired";

  const priceNode = (plan: Plan) => {
    if (plan.annual === null) {
      return <span className="font-display text-[28px] font-medium text-foreground">{plan.cta === "Contact sales" ? "Custom" : "Free"}</span>;
    }
    const value = cycle === "annual" ? plan.annual : plan.monthly;
    return (
      <>
        <span className="font-display text-[28px] font-medium text-foreground">₹{value}</span>
        <span className="text-xs text-muted-foreground"> / employee · month</span>
      </>
    );
  };

  const renderPlan = (plan: Plan) => {
    const current = status.plan === plan.id && status.status === "active";
    return (
      <Card
        key={plan.id}
        className={cn(
          "relative flex flex-col p-5",
          plan.highlight && "ring-2 ring-primary",
          current && "ring-1 ring-primary"
        )}
      >
        {plan.badge && (
          <span
            className={cn(
              "absolute -top-2.5 left-5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              plan.highlight
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-muted text-muted-foreground"
            )}
          >
            {plan.badge}
          </span>
        )}
        <h2 className="font-display text-lg font-medium tracking-tight text-foreground">{plan.name}</h2>
        <p className="mt-0.5 min-h-[36px] text-[13px] text-muted-foreground">{plan.tagline}</p>
        <p className="tabular mt-3">{priceNode(plan)}</p>
        {plan.annual !== null && cycle === "annual" && (
          <p className="mt-1 text-[11px] text-muted-foreground">billed annually · save 20%</p>
        )}
        {plan.annual !== null && cycle === "monthly" && (
          <p className="mt-1 text-[11px] text-muted-foreground">billed monthly · cancel anytime</p>
        )}
        {plan.includes && (
          <p className="mt-3 rounded-md bg-muted/50 px-2.5 py-1.5 text-[12px] font-medium text-foreground">{plan.includes}</p>
        )}
        <ul className="mt-4 flex-1 space-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-muted-foreground">
              <Check size={14} className="mt-0.5 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>
        {isAdmin ? (
          <Button
            className="mt-5 w-full"
            variant={plan.highlight ? "default" : "outline"}
            disabled={activating !== null || current}
            onClick={() => activate(plan.id)}
          >
            {activating === plan.id ? (
              <Loader2 size={15} className="animate-spin" />
            ) : current ? (
              "Current plan"
            ) : (
              <>
                <ShieldCheck size={15} className="mr-1.5" />
                {plan.cta}
              </>
            )}
          </Button>
        ) : (
          <p className="mt-5 text-xs text-muted-foreground">Only workspace admins can subscribe.</p>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        {expired ? (
          <EmptyState
            icon={<CreditCard size={18} />}
            title="Free trial ended"
            description={
              status.trialEndsAt
                ? `Your 30-day trial ended on ${new Date(status.trialEndsAt).toLocaleDateString()}. Subscribe to continue using the workspace.`
                : "Your trial has ended. Subscribe to continue using the workspace."
            }
          />
        ) : (
          <div className="flex items-start gap-3.5 px-4 py-2 sm:px-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground" aria-hidden>
              <Clock size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {status.daysLeft === 1 ? "1 day left in your free trial" : `${status.daysLeft} days left in your free trial`}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {status.trialEndsAt
                  ? `Trial ends ${new Date(status.trialEndsAt).toLocaleDateString()}. Pick a plan below to keep going without interruption.`
                  : "Pick a plan below to keep going without interruption."}
              </p>
            </div>
          </div>
        )}
      </Card>

      {upgradeFeature && (
        <Card className="flex items-start gap-3 border-amber-300/40 p-4 sm:p-5" role="status">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-600 dark:text-amber-300" aria-hidden>
            <Sparkles size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {FEATURE_LABELS[upgradeFeature]} isn&apos;t included in your current plan
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Upgrade to Growth or higher to unlock it. Your data stays intact — the feature simply turns on once you
              subscribe.
            </p>
          </div>
        </Card>
      )}

      <div className="flex flex-col items-center gap-2">
        <h1 className="font-display text-xl font-medium tracking-tight text-foreground">Plans that fit how you grow</h1>
        <p className="max-w-xl text-center text-[13px] text-muted-foreground">
          Pay for HR per employee. Add Projects and AI when you need them — or bundle all three and replace your
          separate HRMS, project tool and AI assistant.
        </p>
        <div className="mt-1 inline-flex items-center rounded-full border border-border bg-muted/40 p-0.5">
          {(["annual", "monthly"] as Cycle[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
                cycle === c ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={cycle === c}
            >
              {c}
            </button>
          ))}
          <span className="ml-1.5 mr-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            Save 20%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{HR_PLANS.map(renderPlan)}</div>

      <Card className="relative overflow-hidden border-primary/30 p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" aria-hidden />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                <Sparkles size={17} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-medium tracking-tight text-foreground">{BUNDLE.name}</h2>
                  {BUNDLE.badge && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                      {BUNDLE.badge}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{BUNDLE.tagline}</p>
              </div>
            </div>
            <p className="tabular mt-4">{priceNode(BUNDLE)}</p>
            {cycle === "annual" ? (
              <p className="mt-1 text-[11px] text-muted-foreground">billed annually · save 20%</p>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">billed monthly · cancel anytime</p>
            )}
            <p className="mt-3 rounded-md bg-muted/50 px-2.5 py-1.5 text-[12px] font-medium text-foreground">{BUNDLE.includes}</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BUNDLE.features.map((f) => (
                <div key={f} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <Check size={14} className="mt-0.5 shrink-0 text-primary" />
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-48 lg:shrink-0">
            {isAdmin ? (
              <Button
                className="w-full"
                disabled={activating !== null || (status.plan === BUNDLE.id && status.status === "active")}
                onClick={() => activate(BUNDLE.id)}
              >
                {activating === BUNDLE.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : status.plan === BUNDLE.id && status.status === "active" ? (
                  "Current plan"
                ) : (
                  <>
                    <ShieldCheck size={15} className="mr-1.5" />
                    {BUNDLE.cta}
                  </>
                )}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Only workspace admins can subscribe.</p>
            )}
          </div>
        </div>
      </Card>

      <div>
        <h2 className="font-display text-base font-medium tracking-tight text-foreground">Free &amp; enterprise</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="flex items-start gap-3 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground" aria-hidden>
              <Users size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Free</h3>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  Up to 5 employees
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Directory, attendance and leave — forever free. Start without a card, upgrade when payroll or projects
                come along.
              </p>
            </div>
          </Card>
          <Card className="flex items-start gap-3 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground" aria-hidden>
              <Building2 size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Enterprise</h3>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  200+ employees
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                On-prem / VPC AI, data residency, custom SLA, security review and a dedicated customer success manager.
              </p>
              <Button variant="outline" size="sm" className="mt-3" disabled>
                Talk to sales
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="font-display text-base font-medium tracking-tight text-foreground">Add-ons &amp; expansion</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Start lean, add seats as usage grows. Billed per seat / credit on top of any plan.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          {ADDONS.map((addon) => {
            const Icon = addon.icon;
            return (
              <Card key={addon.name} className="flex flex-col p-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground" aria-hidden>
                    <Icon size={17} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{addon.name}</h3>
                </div>
                <p className="tabular mt-3">
                  <span className="font-display text-[22px] font-medium text-foreground">
                    {cycle === "annual" ? addon.price : addon.priceMonthly}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">{addon.unit}</p>
                <p className="mt-3 flex-1 text-[13px] text-muted-foreground">{addon.blurb}</p>
              </Card>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Prices in INR, exclusive of 18% GST. Annual plans are billed yearly and renew at the then-current rate with
        30 days&apos; notice. Demo billing — no payment is collected. Connect a gateway (Razorpay/Stripe) before
        production use.
      </p>
    </div>
  );
}
