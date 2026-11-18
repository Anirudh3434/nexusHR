"use client";

import React from "react";
import { 
  Lock, 
  Mail, 
  ArrowLeft,
  ArrowRight,
  Sparkles
} from "lucide-react";
// UI components
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

  const heroBackgroundStyle: React.CSSProperties = {
    backgroundImage: loginBackground 
      ? `linear-gradient(135deg, ${palette.primary}e6, ${palette.secondary}f2), url(${loginBackground})` 
      : `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: !isDefaultBg ? loginBackgroundColor : palette.primary,
  };

  const isMobile = deviceMode === 'mobile';

  return (
    <div 
      className={`relative flex transition-all duration-500 overflow-hidden bg-white dark:bg-[#0b1220] ${
        isFullScreen 
          ? 'fixed inset-0 z-[100] w-screen h-screen flex-col md:flex-row' 
          : isMobile
            ? 'w-full max-w-[360px] mx-auto min-h-[620px] rounded-3xl border border-border shadow-2xl flex-col'
            : 'w-full min-h-[580px] rounded-3xl border border-border shadow-2xl flex-col md:flex-row'
      }`}
      style={brandStyle}
    >
      {/* LEFT COLUMN: Brand Hero Canvas */}
      <div 
        className={`relative flex flex-col justify-between overflow-hidden text-white shrink-0 ${
          isMobile 
            ? 'w-full min-h-[260px] p-6' 
            : 'w-full md:w-[52%] lg:w-[55%] xl:w-[58%] min-h-[300px] md:min-h-full p-6 sm:p-10 md:py-8 md:pl-8 md:pr-18 lg:py-10 lg:pl-10 lg:pr-22'
        }`}
        style={heroBackgroundStyle}
      >
        {/* Subtle decorative glows */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-black/15 blur-2xl pointer-events-none" />

        {/* Top Header: Logo & Company Name */}
        <div className="relative z-20 flex items-center gap-3">
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center overflow-hidden shrink-0">
            <SmartLogoBadge 
              src={logo} 
              alt={companyName}
              className="h-full w-full object-contain"
              fallbackBg={palette.primary}
            />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white drop-shadow-sm">
              {companyName}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/15 backdrop-blur-md text-white/90 border border-white/20 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified Workspace
            </div>
          </div>
        </div>

        {/* Middle Hero: Title & Subtitle */}
        <div className="relative z-20 my-4 md:my-auto max-w-md">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 backdrop-blur-md text-white border border-white/20 mb-2.5 shadow-sm">
            <Sparkles className="w-3 h-3" />
            Enterprise Portal
          </div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-2xl sm:text-3xl lg:text-4xl'} font-black tracking-tight leading-tight text-white drop-shadow-sm`}>
            {loginTitle || 'Welcome Back'}
          </h1>
          <p className="text-xs sm:text-sm text-white/85 font-medium leading-relaxed mt-2">
            {loginSubtitle || 'Sign in to access your workspace'}
          </p>
        </div>

        {/* Desktop Organic S-Curve Wave Divider on the RIGHT edge of left hero */}
        {!isMobile && (
          <svg
            className="absolute top-0 -right-px bottom-0 h-full w-14 lg:w-20 xl:w-24 pointer-events-none z-10 hidden md:block text-white dark:text-[#0b1220] transition-colors duration-300"
            viewBox="0 0 100 1000"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path fill="currentColor" d="M100,0 C35,180 20,380 55,650 C85,820 60,930 100,1000 Z" />
          </svg>
        )}

        {/* Mobile Bottom Wave Divider */}
        {isMobile && (
          <svg
            className="absolute -bottom-px left-0 right-0 w-full h-8 sm:h-10 pointer-events-none z-20 text-white dark:text-[#0b1220] transition-colors duration-300"
            viewBox="0 0 1000 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path fill="currentColor" d="M0,100 L0,30 C250,90 400,5 650,65 C850,110 950,30 1000,100 Z" />
          </svg>
        )}
      </div>

      {/* RIGHT COLUMN: Sign In Form */}
      <div className={`relative flex flex-col justify-between bg-white dark:bg-[#0b1220] transition-colors duration-300 grow ${
        isMobile 
          ? 'w-full p-6' 
          : 'w-full md:w-[48%] lg:w-[45%] xl:w-[42%] p-6 sm:p-8 lg:p-10'
      }`}>
        <div className="w-full max-w-sm mx-auto my-auto py-2">
          <div className="mb-5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Employee Sign In
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter your credentials to access your workplace dashboard
            </p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 ml-0.5 text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors group-focus-within:text-primary text-slate-400" />
                <Input
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10 h-10 text-xs font-medium rounded-xl transition-all shadow-inner bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-primary"
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 ml-0.5 text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors group-focus-within:text-primary text-slate-400" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-10 text-xs rounded-xl transition-all shadow-inner bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-primary"
                  disabled
                />
              </div>
            </div>

            <Button 
              className="w-full h-10 rounded-xl text-xs font-bold tracking-wider uppercase text-white shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mt-2"
              style={{
                background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
                boxShadow: `0 8px 24px -6px ${palette.primaryGlow || 'rgba(0,0,0,0.3)'}`,
              }}
              disabled
            >
              <span>Sign In to Workplace</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="pt-2 flex items-center justify-between text-center">
              <span className="text-xs font-semibold inline-flex items-center gap-1.5 cursor-default transition-colors text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                <ArrowLeft className="h-3 w-3" />
                Back to home
              </span>
            </div>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-900 text-center text-[11px] text-slate-400 dark:text-slate-500">
          Secure Enterprise Authentication • 256-Bit SSL Encrypted
        </div>
      </div>
    </div>
  );
}
