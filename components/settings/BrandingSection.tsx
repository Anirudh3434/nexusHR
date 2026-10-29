"use client";

import React, { useState } from "react";
import { 
  Loader2, 
  Upload, 
  Image as ImageIcon, 
  Type, 
  Palette, 
  Save, 
  X, 
  Check, 
  Maximize2, 
  Monitor,
  Smartphone,
  Tablet,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Layers,
  Wand2
} from "lucide-react";
import { 
  extractTwoMajorLogoColors,
  generatePaletteFromColor, 
  applyDynamicCompanyTheme,
  resetThemeToDefault,
  isColorDark,
  type BrandPalette,
  DEFAULT_BRAND_PRIMARY,
  DEFAULT_BRAND_SECONDARY
} from "@/lib/imageUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SmartLogoBadge } from "@/components/ui/SmartLogoBadge";
import { LoginPageView } from "./LoginPageView";
import { Settings, BRANDING_UPDATED_EVENT } from "@/services/settingsService";
import { uploadImage } from "@/services/uploadService";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

interface BrandingSectionProps {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  companyName: string;
}

export function BrandingSection({ 
  settings, 
  setSettings, 
  onSave, 
  isSaving,
  companyName 
}: BrandingSectionProps) {
  const { addToast } = useToast();
  const [isUploading, setIsUploading] = useState<'logo' | 'background' | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isExtractingPalette, setIsExtractingPalette] = useState(false);
  const [activeColorTab, setActiveColorTab] = useState<'primary' | 'secondary'>('primary');
  const [currentPalette, setCurrentPalette] = useState<BrandPalette | null>(() => 
    settings.primaryColor 
      ? generatePaletteFromColor(settings.primaryColor, settings.secondaryColor || undefined) 
      : null
  );

  // Grouped harmonic color families
  const colorFamilies = [
    {
      name: "Ocean & Teal",
      colors: ['#0f766e', '#0d9488', '#0891b2', '#0284c7', '#2563eb', '#1e293b']
    },
    {
      name: "Indigo & Royal",
      colors: ['#3b82f6', '#4f46e5', '#6366f1', '#7c3aed', '#9333ea', '#c026d3']
    },
    {
      name: "Rose & Sunset",
      colors: ['#db2777', '#e11d48', '#dc2626', '#ea580c', '#d97706', '#ca8a04']
    },
    {
      name: "Nature & Modern Slate",
      colors: ['#65a30d', '#16a34a', '#059669', '#10b981', '#475569', '#0b1220']
    }
  ];

  const handleImageUpload = async (file: File, type: 'logo' | 'background') => {
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: 'Invalid File', description: 'Please upload an image file (PNG, JPG, SVG, WebP)' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', title: 'File Too Large', description: 'Image size should be less than 5MB' });
      return;
    }

    setIsUploading(type);
    try {
      const result = await uploadImage(file, type === 'logo' ? 'hrm/logo' : 'hrm/background');
      if (type === 'logo') {
        try {
          const colors = await extractTwoMajorLogoColors(result.secure_url);
          if (colors) {
            setSettings({
              ...settings,
              logo: result.secure_url,
              primaryColor: colors.primary,
              secondaryColor: colors.secondary,
              themeSource: 'logo',
            });
            const palette = generatePaletteFromColor(colors.primary, colors.secondary);
            setCurrentPalette(palette);
            applyDynamicCompanyTheme(colors.primary, colors.secondary);
            addToast({ 
              type: 'success', 
              title: 'Brand Colors Extracted', 
              description: `Extracted Primary (${colors.primary}) & Secondary (${colors.secondary}) from your logo!` 
            });
          } else {
            setSettings({
              ...settings,
              logo: result.secure_url,
            });
            addToast({ type: 'success', title: 'Logo Uploaded', description: 'Company logo updated successfully.' });
          }
        } catch {
          setSettings({
            ...settings,
            logo: result.secure_url,
          });
          addToast({ type: 'success', title: 'Logo Uploaded', description: 'Company logo updated successfully.' });
        }
      } else {
        setSettings({
          ...settings,
          loginBackground: result.secure_url,
        });
        addToast({ type: 'success', title: 'Background Uploaded', description: 'Login screen wallpaper updated.' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      addToast({ type: 'error', title: 'Upload Failed', description: 'Could not upload image. Please try again.' });
    } finally {
      setIsUploading(null);
    }
  };

  const handleExtractPalette = async () => {
    if (!settings.logo) {
      addToast({ type: 'error', title: 'No Logo Found', description: 'Please upload a company logo first.' });
      return;
    }
    setIsExtractingPalette(true);
    try {
      const colors = await extractTwoMajorLogoColors(settings.logo);
      if (colors) {
        setSettings({
          ...settings,
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          themeSource: 'logo',
        });
        const palette = generatePaletteFromColor(colors.primary, colors.secondary);
        setCurrentPalette(palette);
        applyDynamicCompanyTheme(colors.primary, colors.secondary);
        addToast({
          type: 'success',
          title: 'Logo Colors Synced',
          description: `Primary: ${colors.primary} · Secondary: ${colors.secondary}`,
        });
      } else {
        addToast({ type: 'error', title: 'Notice', description: 'Could not extract high-contrast colors from this image.' });
      }
    } catch {
      addToast({ type: 'error', title: 'Error', description: 'Failed to extract colors from company logo.' });
    } finally {
      setIsExtractingPalette(false);
    }
  };

  const handleSetPrimaryColor = (color: string) => {
    setSettings({ ...settings, primaryColor: color, themeSource: 'custom' });
    const sec = settings.secondaryColor || undefined;
    const pal = generatePaletteFromColor(color, sec);
    setCurrentPalette(pal);
    applyDynamicCompanyTheme(color, pal.secondary);
  };

  const handleSetSecondaryColor = (color: string) => {
    setSettings({ ...settings, secondaryColor: color, themeSource: 'custom' });
    const prim = settings.primaryColor || DEFAULT_BRAND_PRIMARY;
    const pal = generatePaletteFromColor(prim, color);
    setCurrentPalette(pal);
    applyDynamicCompanyTheme(prim, color);
  };

  const handleResetTheme = () => {
    setSettings({
      ...settings,
      primaryColor: DEFAULT_BRAND_PRIMARY,
      secondaryColor: null,
      themeSource: 'default',
    });
    setCurrentPalette(null);
    resetThemeToDefault();
    addToast({
      type: 'info',
      title: 'Default Theme Restored',
      description: 'Workspace reset to standard Harbor & Pine branding.',
    });
  };

  const handleRemoveImage = (type: 'logo' | 'background') => {
    if (type === 'logo') {
      setSettings({
        ...settings,
        logo: null,
        primaryColor: DEFAULT_BRAND_PRIMARY,
        secondaryColor: null,
        themeSource: 'default',
      });
      setCurrentPalette(null);
      resetThemeToDefault();
      addToast({
        type: 'info',
        title: 'Logo Cleared',
        description: 'Company logo removed. System default restored.',
      });
    } else {
      setSettings({
        ...settings,
        loginBackground: null,
      });
      addToast({
        type: 'info',
        title: 'Wallpaper Cleared',
        description: 'Login background reset to atmospheric gradient.',
      });
    }
  };

  const currentColorValue = activeColorTab === 'primary' 
    ? (settings.primaryColor || DEFAULT_BRAND_PRIMARY)
    : (settings.secondaryColor || currentPalette?.secondary || DEFAULT_BRAND_SECONDARY);

  const isLogoTheme = settings.themeSource === 'logo';
  const isCustomTheme = settings.themeSource === 'custom';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ==================================================== */}
      {/* 1. SECTION HEADER WITH STATUS BADGE & PRIMARY ACTIONS */}
      {/* ==================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground font-display">
              Brand Identity & Theme Studio
            </h2>
            {/* Status Pill Badge */}
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
              isLogoTheme && "bg-primary/10 text-primary border-primary/25",
              isCustomTheme && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
              !isLogoTheme && !isCustomTheme && "bg-muted text-muted-foreground border-border"
            )}>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full animate-pulse",
                isLogoTheme && "bg-primary",
                isCustomTheme && "bg-amber-500",
                !isLogoTheme && !isCustomTheme && "bg-muted-foreground"
              )} />
              {isLogoTheme 
                ? "✨ Dynamic Logo-Driven" 
                : isCustomTheme 
                ? "🎨 Custom Palette" 
                : "🌿 Default Harbor & Pine"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Configure your workspace visual identity. Upload your company logo to automatically extract dual brand colors, or curate custom tones with live real-time preview.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleResetTheme} 
            className="h-9 px-3.5 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
            title="Reset to default Harbor & Pine theme"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Default
          </Button>
          <Button 
            onClick={onSave} 
            disabled={isSaving} 
            className="h-9 px-4 text-xs font-bold rounded-xl shadow-xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Branding
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. MAIN 2-COLUMN WORKSPACE: CONTROLS & LIVE PREVIEW   */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Controls & Pickers (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* ------------------------------------------------ */}
          {/* ASSET TILES: Company Logo & Wallpaper           */}
          {/* ------------------------------------------------ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Card 1: Company Logo */}
            <Card className="rounded-[14px] border border-border bg-card shadow-xs overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3 pt-3.5 px-4 border-b border-border/70 flex flex-row items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="h-3.5 w-3.5 text-primary" />
                  Company Logo
                </CardTitle>
                {settings.logo && (
                  <button
                    type="button"
                    onClick={handleExtractPalette}
                    disabled={isExtractingPalette}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                    title="Re-extract colors from this logo"
                  >
                    {isExtractingPalette ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3 text-primary" />
                    )}
                    Re-extract
                  </button>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="h-20 w-20 shrink-0 rounded-2xl border border-border bg-muted/20 flex items-center justify-center p-2 shadow-xs overflow-hidden">
                    {settings.logo ? (
                      <SmartLogoBadge 
                        src={settings.logo} 
                        alt="Company Logo Preview" 
                        className="h-full w-full object-contain"
                        fallbackBg={settings.primaryColor || DEFAULT_BRAND_PRIMARY}
                      />
                    ) : (
                      <div className="text-center text-muted-foreground/60">
                        <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-40" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">No Logo</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('logoInput')?.click()}
                        disabled={isUploading === 'logo'}
                        className="h-8 px-3 text-xs font-semibold rounded-lg"
                      >
                        {isUploading === 'logo' ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 mr-1.5" />
                        )}
                        {settings.logo ? 'Change' : 'Upload'}
                      </Button>
                      {settings.logo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveImage('logo')}
                          className="h-8 px-2.5 text-xs font-semibold rounded-lg text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      SVG, PNG, or WebP. Automatically extracts dual brand colors.
                    </p>
                    <input
                      id="logoInput"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                    />
                  </div>
                </div>

                {/* Extracted Colors Chips */}
                {isLogoTheme && settings.primaryColor && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Extracted:</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono font-bold">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: settings.primaryColor }} />
                      {settings.primaryColor}
                    </span>
                    {settings.secondaryColor && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono font-bold">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: settings.secondaryColor }} />
                        {settings.secondaryColor}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Login Wallpaper */}
            <Card className="rounded-[14px] border border-border bg-card shadow-xs overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3 pt-3.5 px-4 border-b border-border/70 flex flex-row items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Login Wallpaper
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="h-20 w-20 shrink-0 rounded-2xl border border-border bg-muted/20 flex items-center justify-center overflow-hidden shadow-xs relative">
                    {settings.loginBackground ? (
                      <img 
                        src={settings.loginBackground} 
                        alt="Wallpaper Preview" 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <Layers className="h-5 w-5 text-muted-foreground/60 mb-0.5" />
                        <span className="text-[9px] font-bold text-muted-foreground/80 uppercase">Atmosphere</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('bgInput')?.click()}
                        disabled={isUploading === 'background'}
                        className="h-8 px-3 text-xs font-semibold rounded-lg"
                      >
                        {isUploading === 'background' ? (
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 mr-1.5" />
                        )}
                        {settings.loginBackground ? 'Change' : 'Upload'}
                      </Button>
                      {settings.loginBackground && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveImage('background')}
                          className="h-8 px-2.5 text-xs font-semibold rounded-lg text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Full-bleed image for employee sign-in backdrop.
                    </p>
                    <input
                      id="bgInput"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'background')}
                    />
                  </div>
                </div>

                <div className="pt-1 border-t border-border/60">
                  <span className="text-[10px] text-muted-foreground">
                    {settings.loginBackground 
                      ? 'Custom backdrop active' 
                      : 'Default atmospheric glow active when empty'}
                  </span>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* ------------------------------------------------ */}
          {/* COLOR STUDIO & HARMONIC PALETTE BUILDER          */}
          {/* ------------------------------------------------ */}
          <Card className="rounded-[14px] border border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3 pt-3.5 px-5 border-b border-border/70 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Color Studio & Harmony
              </CardTitle>
              <span className="text-[11px] text-muted-foreground font-medium">
                Dual-color brand architecture
              </span>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              
              {/* Primary vs Secondary Segment Selector */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-muted/60 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setActiveColorTab('primary')}
                  className={cn(
                    "flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg text-xs font-bold transition-all",
                    activeColorTab === 'primary' 
                      ? "bg-card text-foreground shadow-xs border border-border/50" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span 
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs" 
                    style={{ backgroundColor: settings.primaryColor || DEFAULT_BRAND_PRIMARY }}
                  />
                  <span>Primary Color (Buttons & Brand)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveColorTab('secondary')}
                  className={cn(
                    "flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg text-xs font-bold transition-all",
                    activeColorTab === 'secondary' 
                      ? "bg-card text-foreground shadow-xs border border-border/50" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span 
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs" 
                    style={{ backgroundColor: settings.secondaryColor || currentPalette?.secondary || DEFAULT_BRAND_SECONDARY }}
                  />
                  <span>Secondary Color (Accent & Trim)</span>
                </button>
              </div>

              {/* Dynamic Theme Palette Strip */}
              {currentPalette && (
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      Harmonic Palette Tokens
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      CSS Custom Properties Live
                    </span>
                  </div>

                  {/* Gradient Fusion Preview Bar */}
                  <div 
                    className="h-2 w-full rounded-full shadow-inner transition-all duration-500"
                    style={{
                      background: `linear-gradient(90deg, ${currentPalette.primary}, ${currentPalette.secondary}, ${currentPalette.accent})`
                    }}
                  />

                  {/* 4 Palette Swatch Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    
                    {/* Primary */}
                    <div 
                      onClick={() => setActiveColorTab('primary')}
                      className={cn(
                        "p-2.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.02]",
                        activeColorTab === 'primary' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: currentPalette.primary }} />
                        <span className="text-[11px] font-bold text-foreground">Primary</span>
                      </div>
                      <span className="block font-mono text-[10px] font-bold uppercase text-muted-foreground">
                        {currentPalette.primary}
                      </span>
                      <span className="block text-[9px] text-muted-foreground/80 mt-0.5">Core brand token</span>
                    </div>

                    {/* Secondary */}
                    <div 
                      onClick={() => setActiveColorTab('secondary')}
                      className={cn(
                        "p-2.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.02]",
                        activeColorTab === 'secondary' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: currentPalette.secondary }} />
                        <span className="text-[11px] font-bold text-foreground">Secondary</span>
                      </div>
                      <span className="block font-mono text-[10px] font-bold uppercase text-muted-foreground">
                        {currentPalette.secondary}
                      </span>
                      <span className="block text-[9px] text-muted-foreground/80 mt-0.5">Accent & highlights</span>
                    </div>

                    {/* Accent / Ring */}
                    <div className="p-2.5 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: currentPalette.accent }} />
                        <span className="text-[11px] font-bold text-foreground">Accent</span>
                      </div>
                      <span className="block font-mono text-[10px] font-bold uppercase text-muted-foreground">
                        {currentPalette.accent}
                      </span>
                      <span className="block text-[9px] text-muted-foreground/80 mt-0.5">Focus rings & pills</span>
                    </div>

                    {/* Surface Tint */}
                    <div className="p-2.5 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span 
                          className="h-3.5 w-3.5 rounded-full border border-border" 
                          style={{ backgroundColor: currentPalette.primaryLight }} 
                        />
                        <span className="text-[11px] font-bold text-foreground">Tint</span>
                      </div>
                      <span className="block font-mono text-[10px] font-bold text-muted-foreground">
                        12% Opacity
                      </span>
                      <span className="block text-[9px] text-muted-foreground/80 mt-0.5">Table & card wash</span>
                    </div>

                  </div>
                </div>
              )}

              {/* Curated Color Swatches grouped by family */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Quick Pick Curated Tones:
                  </span>
                  <span className="text-[11px] text-muted-foreground capitalize">
                    Targeting {activeColorTab}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colorFamilies.map((family) => (
                    <div key={family.name} className="flex items-center gap-3">
                      <span className="text-[10px] font-semibold text-muted-foreground w-28 shrink-0 truncate">
                        {family.name}
                      </span>
                      <div className="flex items-center gap-2 flex-1">
                        {family.colors.map((color) => {
                          const isSelected = activeColorTab === 'primary'
                            ? settings.primaryColor?.toLowerCase() === color.toLowerCase()
                            : settings.secondaryColor?.toLowerCase() === color.toLowerCase();
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                if (activeColorTab === 'primary') {
                                  handleSetPrimaryColor(color);
                                } else {
                                  handleSetSecondaryColor(color);
                                }
                              }}
                              className={cn(
                                "relative h-8 flex-1 rounded-lg border border-border transition-all active:scale-95 hover:scale-105",
                                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-sm"
                              )}
                              style={{ backgroundColor: color }}
                              title={`${color} (${family.name})`}
                            >
                              {isSelected && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 text-white drop-shadow-md" strokeWidth={3.5} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Hex Picker Row */}
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={currentColorValue}
                      onChange={(e) => {
                        if (activeColorTab === 'primary') {
                          handleSetPrimaryColor(e.target.value);
                        } else {
                          handleSetSecondaryColor(e.target.value);
                        }
                      }}
                      className="h-10 w-12 rounded-xl cursor-pointer border border-border bg-card p-1 shadow-xs"
                    />
                  </div>
                  <div className="flex-1 relative">
                    <Input
                      value={currentColorValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeColorTab === 'primary') {
                          handleSetPrimaryColor(val);
                        } else {
                          handleSetSecondaryColor(val);
                        }
                      }}
                      className="font-mono text-sm h-10 border-border uppercase tracking-tight font-bold rounded-xl pr-20"
                      placeholder="#0F766E"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground uppercase bg-muted/60 px-2 py-0.5 rounded-md">
                      {isColorDark(currentColorValue) ? 'Dark Tone' : 'Light Tone'}
                    </span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* ------------------------------------------------ */}
          {/* MESSAGING CUSTOMIZATION                          */}
          {/* ------------------------------------------------ */}
          <Card className="rounded-[14px] border border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3 pt-3.5 px-5 border-b border-border/70 flex flex-row items-center justify-between">
              <CardTitle className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                Sign-In Messaging
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Headline
                  </label>
                  <Input
                    value={settings.loginTitle || ''}
                    onChange={(e) => setSettings({...settings, loginTitle: e.target.value})}
                    placeholder="Welcome Back"
                    className="font-bold h-10 rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">Main greeting on the employee portal.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    Subheading
                  </label>
                  <Input
                    value={settings.loginSubtitle || ''}
                    onChange={(e) => setSettings({...settings, loginSubtitle: e.target.value})}
                    placeholder={`Sign in to access your workspace`}
                    className="text-xs font-medium h-10 rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">Subtitle guidance shown below headline.</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN: Live Interactive Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-6">
          <Card className="rounded-[14px] border border-border bg-card shadow-sm overflow-hidden">
            {/* Preview Toolbar with Device Switcher */}
            <CardHeader className="bg-muted/30 pb-3 pt-3 px-4 border-b border-border/70 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <CardTitle className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                  Live View
                </CardTitle>
              </div>

              {/* Viewport Toggles */}
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setDeviceMode('desktop')}
                  className={cn(
                    "p-1.5 rounded-md text-muted-foreground transition-colors",
                    deviceMode === 'desktop' ? "bg-card text-foreground shadow-xs" : "hover:text-foreground"
                  )}
                  title="Desktop View"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('tablet')}
                  className={cn(
                    "p-1.5 rounded-md text-muted-foreground transition-colors",
                    deviceMode === 'tablet' ? "bg-card text-foreground shadow-xs" : "hover:text-foreground"
                  )}
                  title="Tablet View"
                >
                  <Tablet className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('mobile')}
                  className={cn(
                    "p-1.5 rounded-md text-muted-foreground transition-colors",
                    deviceMode === 'mobile' ? "bg-card text-foreground shadow-xs" : "hover:text-foreground"
                  )}
                  title="Mobile View"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Fullscreen Trigger */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowFullPreview(true)}
                className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg"
              >
                <Maximize2 className="h-3 w-3 mr-1" />
                Expand
              </Button>
            </CardHeader>

            <CardContent className="p-3">
              <div className="rounded-xl overflow-hidden border border-border/80 shadow-inner bg-slate-950/5 dark:bg-black/30">
                <LoginPageView 
                  settings={settings} 
                  companyName={companyName}
                  deviceMode={deviceMode}
                />
              </div>
              <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Viewport: <strong className="text-foreground capitalize">{deviceMode}</strong></span>
                <span>Active Theme: <strong className="text-foreground uppercase">{currentColorValue}</strong></span>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* ==================================================== */}
      {/* 3. FULL-SCREEN PRODUCTION PREVIEW MODAL              */}
      {/* ==================================================== */}
      {showFullPreview && (
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
          <LoginPageView 
            settings={settings} 
            companyName={companyName}
            isFullScreen
          />
          <Button
            type="button"
            className="fixed top-6 right-6 z-[110] bg-background/85 backdrop-blur-md hover:bg-background text-foreground border border-border rounded-full h-11 w-11 p-0 shadow-2xl active:scale-90 transition-all hover:rotate-90"
            onClick={() => setShowFullPreview(false)}
            title="Close Preview"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="fixed bottom-6 left-6 z-[110] bg-card/90 backdrop-blur-md px-4 py-2 rounded-xl border border-border text-foreground flex items-center gap-3 text-xs font-semibold shadow-xl">
            <Monitor className="h-4 w-4 text-primary" />
            <span>Full Display Simulation</span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground text-[11px]">Press ESC or click close to return</span>
          </div>
        </div>
      )}
    </div>
  );
}
