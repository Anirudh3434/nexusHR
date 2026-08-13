"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Building2, Loader2, ArrowRight, ArrowLeft, AlertCircle, Search } from "lucide-react";

export default function CompanyPortalLogin() {
  const [companyCode, setCompanyCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const router = useRouter();

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = companyCode.trim();
    if (!code) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/company/${encodeURIComponent(code)}`);
      const data = await response.json();

      if (!response.ok || !data.exists) {
        setError(data.message || `No company found with code "${code}". Please check and try again.`);
        setIsLoading(false);
        return;
      }

      addToast({ type: "success", title: "Company Found", description: `Redirecting to ${data.company.name} portal...` });
      router.push(`/${data.company.code}`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Nexus<span className="text-indigo-600">HR</span>
          </h1>
          <p className="mt-1 text-sm font-semibold text-indigo-600">Company Portal Login</p>
          <p className="mt-1 text-xs text-gray-500">Enter your company code to sign in to your organization portal</p>
        </div>

        <Card className="shadow-xl border-gray-200">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-xl font-bold tracking-tight">Find your company</CardTitle>
            <CardDescription className="text-sm text-gray-500">
              You will be taken to your company&apos;s sign-in page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Company Code</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={companyCode}
                    onChange={(e) => {
                      setCompanyCode(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. WEBATLAS"
                    className="pl-10 uppercase tracking-widest"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finding company...
                  </>
                ) : (
                  <>
                    Continue to Sign In
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center space-y-2">
              <Link href="/register" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
                Register a new company
              </Link>
              <div>
                <Link href="/candidate-login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 hover:underline">
                  <ArrowLeft className="h-3.5 w-3.5" /> Candidate portal
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-400">Powered by NexusHR</p>
      </div>
    </div>
  );
}
