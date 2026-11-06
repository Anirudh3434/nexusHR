"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { 
  Mail, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  RotateCw,
} from "lucide-react";

type Step = "request" | "verify" | "success";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const isSuperAdmin = searchParams.get("type") === "superadmin";

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), isSuperAdmin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || "Failed to dispatch verification code.");
      } else {
        setStep("verify");
        setCountdown(60);
      }
    } catch {
      setErrorMessage("Network connection error. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP action
  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), isSuperAdmin }),
      });
      const data = await res.json();
      if (res.ok) {
        setCountdown(60);
      } else {
        setErrorMessage(data.message || "Could not resend verification code.");
      }
    } catch {
      setErrorMessage("Network error during resend.");
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otp.trim().replace(/\s+/g, "");
    if (cleanOtp.length < 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters.");
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
        body: JSON.stringify({
          email: email.trim(),
          otp: cleanOtp,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Verification failed. Please verify the code.");
      } else {
        setStep("success");
      }
    } catch {
      setErrorMessage("Network error occurred during password update.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center px-4 py-12 selection:bg-teal-500/30 selection:text-teal-200">
      
      {/* Background glow mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-teal-500/10 via-indigo-500/5 to-transparent blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-2 group">
            <div className="h-9 w-9 rounded-full bg-white p-1.5 shadow flex items-center justify-center transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="NexusHR" className="h-full w-full object-contain rounded-full" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Nexus<span className="text-teal-400">HR</span>
            </span>
          </Link>
          <p className="text-xs text-slate-400">
            {isSuperAdmin ? "Platform Super Admin Recovery" : "Enterprise Credential Security"}
          </p>
        </div>

        <Card className="border border-white/10 bg-[#0c1222]/90 backdrop-blur-xl shadow-2xl rounded-2xl text-slate-100 overflow-hidden">
          
          <CardHeader className="text-center pb-4 pt-6">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-white">
              {step === "request" && "Forgot Password"}
              {step === "verify" && "Verify 6-Digit OTP"}
              {step === "success" && "Password Reset Complete"}
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              {step === "request" && "Enter your registered email to receive a 6-digit verification code."}
              {step === "verify" && (
                <span>
                  Code dispatched to <strong className="text-teal-300 font-mono">{email}</strong>
                </span>
              )}
              {step === "success" && "Your credentials have been updated. You can now log in."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-6 pb-6">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* STEP 1: Request OTP */}
            {step === "request" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      autoFocus
                      className="h-11 pl-10 bg-white/[0.04] border-white/15 text-white placeholder:text-slate-500 rounded-xl text-xs focus-visible:ring-teal-500/50"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/30"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending Code...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Send Verification Code <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* STEP 2: Verify OTP & Set New Password */}
            {step === "verify" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                
                {/* Gmail Dispatch Info Banner */}
                <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/20 text-left flex items-start gap-2.5 text-xs text-teal-200">
                  <Mail className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">Check your Gmail:</span> A 6-digit OTP has been sent to <span className="font-mono text-teal-300 font-bold">{email}</span>. Please check your inbox or spam folder.
                  </div>
                </div>

                {/* 6-Digit OTP Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">6-Digit Verification Code</label>
                    <button
                      type="button"
                      onClick={() => setStep("request")}
                      className="text-[11px] text-slate-500 hover:text-teal-400 transition-colors"
                    >
                      Change Email
                    </button>
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    placeholder="• • • • • •"
                    required
                    autoFocus
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying Code...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Verify OTP & Reset Password <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Button>

                {/* Resend Option */}
                <div className="text-center pt-1">
                  {countdown > 0 ? (
                    <span className="text-xs text-slate-500 font-mono">
                      Resend code in {countdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="text-xs text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      {resending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCw className="h-3 w-3" />
                      )}
                      Resend Verification Code
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* STEP 3: Success Screen */}
            {step === "success" && (
              <div className="space-y-5 text-center py-2">
                <div className="h-14 w-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">Password Updated!</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your account has been secured with the new password. All prior sessions have been revoked.
                  </p>
                </div>

                <div className="pt-2">
                  <Link href={isSuperAdmin ? "/super-admin/login" : "/login"}>
                    <Button className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/30">
                      Sign In to Workspace <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Bottom Navigation */}
            {step !== "success" && (
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <Link
                  href={isSuperAdmin ? "/super-admin/login" : "/login"}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-teal-400 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                </Link>
                <Link
                  href="/landing"
                  className="text-slate-500 hover:text-slate-300 transition-colors text-[11px]"
                >
                  Platform Overview
                </Link>
              </div>
            )}

          </CardContent>
        </Card>
      </div>

    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center px-4 py-12">
          <div className="flex items-center gap-2 text-teal-400 text-sm">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading verification portal...</span>
          </div>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
