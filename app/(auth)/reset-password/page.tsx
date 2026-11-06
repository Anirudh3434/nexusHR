"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, Loader2, ShieldCheck, KeyRound, Mail, ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();

  const queryEmail = searchParams.get("email") || "";
  const queryCode = searchParams.get("token") || searchParams.get("otp") || "";

  const [email, setEmail] = useState(queryEmail);
  const [otp, setOtp] = useState(queryCode);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otp.trim().replace(/\s+/g, "");

    if (!email.trim()) {
      setErrorMessage("Email address is required.");
      return;
    }

    if (cleanOtp.length < 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: cleanOtp, email: email.trim(), newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Failed to reset password.");
      } else {
        setSuccess(true);
        if (data.isSuperAdmin) setIsSuperAdmin(true);
      }
    } catch {
      setErrorMessage("Network error occurred while connecting to authentication service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-white/10 bg-[#0c1222]/90 backdrop-blur-xl shadow-2xl rounded-2xl text-slate-100 overflow-hidden">
      <CardHeader className="text-center pb-4 pt-6">
        <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-white">
          Reset Account Password
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs">
          Enter the 6-digit OTP code sent to your email and your new password.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-6 pb-6">
        {success ? (
          <div className="space-y-5 text-center py-2">
            <div className="h-14 w-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Password Updated Successfully</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your new password has been securely saved. All previous sessions have been signed out.
              </p>
            </div>

            <div className="pt-2">
              <Link href={isSuperAdmin ? "/super-admin/login" : "/login"}>
                <Button className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/30">
                  Proceed to Sign In <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Email field if not provided in URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="h-11 pl-10 bg-white/[0.04] border-white/15 text-white placeholder:text-slate-500 rounded-xl text-xs focus-visible:ring-teal-500/50"
                />
              </div>
            </div>

            {/* 6-Digit Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">6-Digit Verification Code (OTP)</label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="• • • • • •"
                required
                className="h-12 text-center text-xl font-mono font-extrabold tracking-[10px] bg-white/[0.04] border-white/15 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-teal-500/50"
              />
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="h-11 pl-10 pr-10 bg-white/[0.04] border-white/15 text-white placeholder:text-slate-500 rounded-xl text-xs focus-visible:ring-teal-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="h-11 pl-10 pr-10 bg-white/[0.04] border-white/15 text-white placeholder:text-slate-500 rounded-xl text-xs focus-visible:ring-teal-500/50"
                />
              </div>
              {newPassword && confirmPassword && (
                <div className="pt-0.5 text-[11px]">
                  {newPassword === confirmPassword ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-rose-400">Passwords do not match</span>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || otp.length < 6 || (confirmPassword.length > 0 && newPassword !== confirmPassword)}
              className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/30"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying OTP...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Verify OTP & Update Password <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          </form>
        )}

        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <Link
            href="/forgot-password"
            className="text-xs text-slate-400 hover:text-teal-400 transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Request New Code
          </Link>
          <Link
            href="/login"
            className="text-xs text-slate-400 hover:text-teal-400 transition-colors"
          >
            Return to Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center px-4 py-12 selection:bg-teal-500/30 selection:text-teal-200">
      
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-teal-500/10 via-indigo-500/5 to-transparent blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2">
            <div className="h-9 w-9 rounded-full bg-white p-1.5 shadow flex items-center justify-center">
              <img src="/logo.png" alt="NexusHR" className="h-full w-full object-contain rounded-full" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Nexus<span className="text-teal-400">HR</span>
            </span>
          </Link>
          <p className="text-xs text-slate-400">Credential Verification Gateway</p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center p-8 text-teal-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>

    </div>
  );
}
