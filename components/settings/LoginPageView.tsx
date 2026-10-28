"use client";

import React from "react";
import { 
  Building2, 
  Lock, 
  Mail, 
  ArrowLeft,
  Smartphone,
  Tablet,
  Monitor
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SmartLogoBadge } from "@/components/ui/SmartLogoBadge";
import { generatePaletteFromColor, getBrandColorsFromSettings } from "@/lib/imageUtils";

interface Settings {
  logo?: string | null;
  loginBackground?: string | null;
  loginBackgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string | null;
  themeSource?: 'default' | 'logo' | 'custom';
  loginTitle?: string;
  loginSubtitle?: string;
}

interface LoginPageViewProps {
  settings: Settings;
  companyName?: string;
  isFullScreen?: boolean;
  deviceMode?: 'desktop' | 'tablet' | 'mobile';
}

export function LoginPageView({ 
  settings, 
  companyName = "Your Company", 
  isFullScreen = false,
  deviceMode = 'desktop'
}: LoginPageViewProps) {
  const {
    logo,
    loginBackground,
    loginBackgroundColor,
    loginTitle,
    loginSubtitle
  } = settings;

  const { primary, secondary } = getBrandColorsFromSettings(settings);
  const palette = generatePaletteFromColor(primary, secondary);

  const isDefaultBg = !loginBackgroundColor || 
    loginBackgroundColor.toLowerCase() === '#ffffff' || 
    loginBackgroundColor.toLowerCase() === '#f9fafb' || 
    loginBackgroundColor.toLowerCase() === '#fff';

  const brandStyle = {
    backgroundColor: loginBackground ? 'transparent' : (!isDefaultBg ? loginBackgroundColor : undefined),
    backgroundImage: loginBackground ? `url(${loginBackground})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    "--primary": palette.primary,
    "--primary-foreground": palette.textOnPrimary,
    "--secondary": palette.secondary,
    "--secondary-foreground": palette.textOnSecondary,
    "--accent": palette.primaryLight,
    "--accent-foreground": palette.primary,
    "--ring": palette.primary,
    "--brand-primary": palette.primary,
    "--brand-secondary": palette.secondary,
    "--brand-primary-glow": palette.primaryGlow,
  } as React.CSSProperties;

  // Frame width depending on device mode
  const getContainerMaxWidth = () => {
    if (isFullScreen) return 'max-w-md';
    if (deviceMode === 'mobile') return 'max-w-[340px]';
    if (deviceMode === 'tablet') return 'max-w-[460px]';
    return 'max-w-md';
  };

  return (
    <div 
      className={`relative flex items-center justify-center transition-all duration-500 overflow-hidden bg-slate-50 dark:bg-slate-950 ${
        isFullScreen 
          ? 'fixed inset-0 z-[100] w-screen h-screen' 
          : 'w-full min-h-[540px] p-6 rounded-2xl border border-border'
      }`}
      style={brandStyle}
    >
      {/* Ambient background glows when no custom image is set */}
      {!loginBackground && isDefaultBg && (
        <>
          <div 
            className="absolute -top-32 -left-32 h-72 w-72 rounded-full blur-3xl pointer-events-none opacity-60 transition-colors duration-500"
            style={{ backgroundColor: palette.primaryLight }}
          />
          <div 
            className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full blur-3xl pointer-events-none opacity-60 transition-colors duration-500"
            style={{ backgroundColor: palette.secondaryLight }}
          />
        </>
      )}

      {/* Main Form Container */}
      <div className={`relative w-full ${getContainerMaxWidth()} transition-all duration-300 ${
        isFullScreen ? 'animate-in zoom-in-95 fade-in duration-500' : ''
      }`}>
        {/* Company Header with SmartLogoBadge */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3.5 flex justify-center">
            <SmartLogoBadge 
              src={logo} 
              alt={companyName}
              className="h-20 w-20 p-2.5 shadow-xl shadow-slate-900/10 border border-slate-200/80 transition-transform duration-300 dark:border-slate-700"
              fallbackBg={palette.primary}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display">
            {loginTitle || 'Welcome Back'}
          </h1>
          <p className="text-xs font-semibold text-primary mt-1 tracking-wide uppercase">
            {companyName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {loginSubtitle || `Sign in to access your workspace`}
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/95 backdrop-blur-xl border-border/80 shadow-2xl shadow-[0_20px_50px_-20px_var(--brand-primary-glow)] rounded-2xl overflow-hidden dark:bg-slate-900/95 transition-all">
          {/* Dual Brand Accent Stripe */}
          <div
            className="h-1.5 w-full transition-all duration-500"
            style={{
              background: `linear-gradient(90deg, ${palette.primary}, ${palette.secondary})`,
            }}
          />
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Employee Sign In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-0.5">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10 h-10 bg-background/60 border-border text-xs font-medium rounded-xl focus:bg-background transition-all"
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-0.5">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-10 bg-background/60 border-border text-xs rounded-xl focus:bg-background transition-all"
                  disabled
                />
              </div>
            </div>

            <Button 
              className="w-full h-10 rounded-xl text-xs font-bold tracking-wider uppercase bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-[0_10px_25px_-10px_var(--brand-primary-glow)] active:scale-[0.98] transition-all mt-1"
              disabled
            >
              Sign In
            </Button>

            <div className="pt-1 text-center">
              <span className="text-xs font-semibold inline-flex items-center gap-1.5 text-primary opacity-80 cursor-default">
                <ArrowLeft className="h-3 w-3" />
                Back to home
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Brand Footer */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">
            Powered by NexusHR Enterprise
          </p>
          {isFullScreen && (
            <p className="text-[10px] text-muted-foreground">
              Production Workspace Authentication
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
