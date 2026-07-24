"use client";

import React from "react";
import { 
  Building2, 
  Lock, 
  Mail, 
  Eye, 
  Loader2, 
  ArrowLeft 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface Settings {
  logo: string | null;
  loginBackground: string | null;
  loginBackgroundColor: string;
  primaryColor: string;
  loginTitle: string;
  loginSubtitle: string;
}

interface LoginPageViewProps {
  settings: Settings;
  companyName?: string;
  isFullScreen?: boolean;
}

export function LoginPageView({ settings, companyName = "Your Company", isFullScreen = false }: LoginPageViewProps) {
  const {
    logo,
    loginBackground,
    loginBackgroundColor,
    primaryColor,
    loginTitle,
    loginSubtitle
  } = settings;

  return (
    <div 
      className={`flex items-center justify-center transition-all duration-500 overflow-hidden ${isFullScreen ? 'fixed inset-0 z-[100] w-screen h-screen' : 'w-full min-h-[500px] rounded-xl border border-gray-200'}`}
      style={{
        backgroundColor: loginBackground ? 'transparent' : (loginBackgroundColor || '#f9fafb'),
        backgroundImage: loginBackground ? `url(${loginBackground})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className={`w-full max-w-md ${isFullScreen ? 'animate-in zoom-in-95 fade-in duration-500' : ''} p-4`}>
        {/* Company Header */}
        <div className="text-center mb-6">
          {logo ? (
            <img 
              src={logo} 
              alt="Company Logo" 
              className="h-20 object-contain mx-auto mb-4"
            />
          ) : (
            <div 
              className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: primaryColor || '#2563eb' }}
            >
              <Building2 className="h-8 w-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{loginTitle || 'Welcome Back'}</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">{loginSubtitle || `Sign in to ${companyName}`}</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/90 backdrop-blur-xl border-white shadow-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg font-bold" style={{ color: primaryColor || '#2563eb' }}>
              Employee Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10 h-11 bg-white/50 border-gray-200 focus:bg-white transition-all uppercase text-[11px] font-bold"
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-white/50 border-gray-200 focus:bg-white transition-all"
                  disabled
                />
              </div>
            </div>

            <Button 
              className="w-full h-12 text-sm font-bold tracking-widest uppercase shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
              style={{ backgroundColor: primaryColor || '#2563eb' }}
              disabled
            >
              Sign In
            </Button>

            <div className="mt-4 text-center">
              <button 
                className="text-xs font-bold flex items-center justify-center gap-1.5 mx-auto opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: primaryColor || '#2563eb' }}
                disabled
              >
                <ArrowLeft className="h-3 w-3" />
                Back to home
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            Powered by NexusHR
          </p>
          <p className="text-[9px] text-gray-400 font-medium h-4">
            {isFullScreen && "© 2026 Enterprise Resource Planning"}
          </p>
        </div>
      </div>
    </div>
  );
}
