"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Briefcase, Lock, Mail, Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";

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
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Nexus<span className="text-indigo-600">HR</span>
          </h1>
          <p className="mt-1 text-sm font-semibold text-indigo-600">Candidate Portal</p>
          <p className="mt-1 text-xs text-gray-500">Track your application, interviews and onboarding</p>
        </div>

        <Card className="shadow-xl border-gray-200">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <ShieldCheck size={20} />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">Candidate Login</CardTitle>
            <CardDescription className="text-sm text-gray-500">
              Sign in with the credentials emailed to you by HR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In to Candidate Portal"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> Employee login
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-400">Powered by NexusHR</p>
      </div>
    </div>
  );
}
