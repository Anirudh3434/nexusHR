"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Briefcase, Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

export default function CandidateLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      if (!result.user?.isCandidate) {
        addToast({ type: "error", title: "Wrong Portal", description: "This account is not a candidate account." });
        router.push("/login");
        setIsLoading(false);
        return;
      }
      addToast({ type: "success", title: "Login Successful", description: "Welcome to your candidate portal!" });
      router.push(result.user?.mustChangePassword ? "/candidate/change-password" : "/candidate/dashboard");
    } else {
      addToast({ type: "error", title: "Login Failed", description: result.error || "Invalid credentials" });
    }

    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50/80 p-4 overflow-hidden select-none">
      {/* Vibrant Light-Mode Ambient Glow Auroras */}
      <div className="absolute -top-[15%] -left-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-300/40 via-indigo-200/30 to-blue-200/20 blur-[100px] pointer-events-none animate-pulse duration-1000" />
      <div className="absolute -bottom-[15%] -right-[10%] w-[550px] h-[550px] rounded-full bg-gradient-to-tl from-teal-200/40 via-purple-200/30 to-indigo-200/30 blur-[110px] pointer-events-none animate-pulse duration-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-100/30 blur-[120px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e125_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e125_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        {/* Top Feature Pill */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-purple-100 text-purple-700 text-xs font-bold shadow-sm shadow-purple-100/50 backdrop-blur-md transition-all hover:border-purple-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
            </span>
            <span>Candidate Talent Gateway</span>
          </div>
        </div>

        {/* Logo & Header */}
        <div className="mb-6 text-center">
          <div className="relative mx-auto mb-4 inline-block group">
            {/* Soft outer glow */}
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-purple-400/30 via-indigo-400/20 to-teal-400/30 opacity-70 blur-lg group-hover:opacity-100 transition duration-500 group-hover:scale-110" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#03081c] p-2 shadow-2xl shadow-slate-900/20 ring-4 ring-white border border-[#03081c] transition-transform duration-300 group-hover:scale-105">
              <img 
                src="/logo.png" 
                alt="NexusHR Logo" 
                className="h-full w-full object-contain scale-110" 
              />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Nexus<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600">HR</span>
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-purple-600">Candidate Portal</p>
          <p className="mt-1 text-xs text-slate-500">Track your interview stages, offers, and onboarding status</p>
        </div>

        {/* High-Dopamine Glassmorphic Card */}
        <div className="relative group">
          {/* Card Border Glow */}
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-purple-200/60 via-indigo-100/40 to-teal-200/50 opacity-80 blur-sm group-hover:opacity-100 transition duration-500" />
          
          <Card className="relative shadow-2xl shadow-purple-900/5 border-white/80 bg-white/90 backdrop-blur-2xl rounded-3xl overflow-hidden p-1">
            <CardHeader className="space-y-1.5 text-center pb-2 pt-5">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 mb-1">
                <ShieldCheck size={20} />
              </div>
              <CardTitle className="text-lg font-extrabold tracking-tight text-slate-900">Candidate Sign In</CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium">
                Sign in with the credentials provided by your hiring team
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">Email Address</label>
                  <div className="relative group/input">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-purple-600 transition-colors" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 h-12 rounded-xl bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition-all shadow-inner font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">Password</label>
                  <div className="relative group/input">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-purple-600 transition-colors" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your security password"
                      className="pl-10 pr-10 h-12 rounded-xl bg-slate-50/80 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-4 focus:ring-purple-100 transition-all shadow-inner font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 hover:from-purple-700 hover:via-indigo-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-xl shadow-purple-600/25 transition-all duration-200 active:scale-[0.98] mt-2" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Authenticating Candidate...
                    </>
                  ) : (
                    <>
                      Sign In to Candidate Portal
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <Link href="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-purple-600 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Switch to Employee Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dopamine Micro Trust Badges */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">🔒 Private Data</span>
          <span>•</span>
          <span className="flex items-center gap-1">⚡ Fast-Track Hiring</span>
          <span>•</span>
          <span className="flex items-center gap-1">🤝 Direct HR Link</span>
        </div>
      </div>
    </div>
  );
}
