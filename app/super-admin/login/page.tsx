"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Crown, Loader2, Lock, Mail } from "lucide-react";

/**
 * Platform sign-in — separate from company portals. Password only.
 * Only super_admin sessions are admitted; everyone else is signed straight
 * back out with an explanation.
 */
export default function SuperAdminLoginPage() {
  const { user, loading, login, logout } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"password" | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if ((user.role as string) === "super_admin") {
      router.push("/super-admin");
    } else {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const admit = (u: { role?: string } | undefined) => {
    if ((u?.role as string) !== "super_admin") {
      logout();
      addToast({ type: "error", title: "Platform access only", description: "This sign-in is reserved for super admins." });
      return false;
    }
    addToast({ type: "success", title: "Welcome back", description: "Signed in to platform administration." });
    router.push("/super-admin");
    return true;
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("password");
    const result = await login(email.trim(), password);
    if (result.success) {
      admit(result.user);
    } else {
      addToast({ type: "error", title: "Sign-in failed", description: result.error || "Invalid credentials" });
    }
    setBusy(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1220] p-4">
      <Card className="w-full max-w-md border-white/10 bg-white p-2 dark:bg-slate-900">
        <CardHeader className="text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0b1220] text-white" aria-hidden>
            <Crown size={22} />
          </span>
          <CardTitle className="font-display text-[22px] font-medium tracking-tight">Platform sign-in</CardTitle>
          <CardDescription>Super admins only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePassword} className="space-y-3.5">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@platform.com"
                className="h-11 pl-10"
                required
                autoFocus
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-11 pl-10"
                required
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={busy !== null}>
              {busy === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
