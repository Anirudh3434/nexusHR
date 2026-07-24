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
  Monitor 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoginPageView } from "./LoginPageView";
import { Settings } from "@/services/settingsService";
import { uploadImage } from "@/services/uploadService";
import { useToast } from "@/context/ToastContext";

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

  // Windows-style color palette
  const colorPalette = [
    '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151',
    '#1f2937', '#111827', '#000000', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78350f', '#92400e', '#b45309', '#d97706',
  ];

  const handleImageUpload = async (file: File, type: 'logo' | 'background') => {
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: 'Error', description: 'Please upload an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', title: 'Error', description: 'Image size should be less than 5MB' });
      return;
    }

    setIsUploading(type);
    try {
      const result = await uploadImage(file, type === 'logo' ? 'hrm/logo' : 'hrm/background');
      setSettings({
        ...settings,
        [type === 'logo' ? 'logo' : 'loginBackground']: result.secure_url,
      });
      addToast({ type: 'success', title: 'Success', description: `${type === 'logo' ? 'Logo' : 'Background'} uploaded` });
    } catch (error) {
      console.error('Upload error:', error);
      addToast({ type: 'error', title: 'Error', description: 'Failed to upload image' });
    } finally {
      setIsUploading(null);
    }
  };

  const handleRemoveImage = (type: 'logo' | 'background') => {
    setSettings({
      ...settings,
      [type === 'logo' ? 'logo' : 'loginBackground']: null,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="h-6 w-6 text-blue-600" />
            Branding & Login Customization
          </h2>
          <p className="text-sm text-gray-500">Tailor the login experience for your employees.</p>
        </div>
        <Button onClick={onSave} disabled={isSaving} className="shadow-lg shadow-blue-500/10">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Branding
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo & Background */}
        <div className="space-y-6">
          <Card className="border-gray-100 shadow-sm overflow-hidden group">
            <CardHeader className="bg-gray-50/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                <ImageIcon className="h-4 w-4" />
                Company Assets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Logo */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">Company Logo</label>
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center bg-gray-50/50 overflow-hidden transition-all group-hover:border-blue-200 group-hover:bg-blue-50/10">
                    {settings.logo ? (
                      <img src={settings.logo} alt="Logo preview" className="h-full w-full object-contain p-3" />
                    ) : (
                      <div className="text-center text-gray-300">
                        <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-50" />
                        <span className="text-[10px] font-bold">MISSING</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('logoInput')?.click()}
                        disabled={isUploading === 'logo'}
                        className="bg-white border-gray-200 hover:border-blue-200 hover:text-blue-600 transition-all font-bold text-xs h-9 px-4 rounded-xl"
                      >
                        {isUploading === 'logo' ? (
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 mr-2" />
                        )}
                        Upload logo
                      </Button>
                      {settings.logo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-xs h-9 px-4 rounded-xl"
                          onClick={() => handleRemoveImage('logo')}
                        >
                          <X className="h-3 w-3 mr-2" />
                          Clear
                        </Button>
                      )}
                    </div>
                    <input
                      id="logoInput"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                    />
                  </div>
                </div>
              </div>

              {/* Background */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">Login Background</label>
                <div className="flex items-center gap-4">
                  <div 
                    className={`relative h-24 w-24 border-2 rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
                      settings.loginBackground ? 'border-blue-500 border-solid shadow-md shadow-blue-500/20' : 'border-dashed border-gray-200'
                    }`}
                    style={{ backgroundColor: settings.loginBackground ? undefined : settings.loginBackgroundColor }}
                  >
                    {settings.loginBackground ? (
                        <img src={settings.loginBackground} alt="Background preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-300 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                       <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('bgInput')?.click()}
                        disabled={isUploading === 'background'}
                        className="bg-white border-gray-200 hover:border-blue-200 hover:text-blue-600 transition-all font-bold text-xs h-9 px-4 rounded-xl"
                      >
                        {isUploading === 'background' ? (
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 mr-2" />
                        )}
                        Upload image
                      </Button>
                      {settings.loginBackground && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-xs h-9 px-4 rounded-xl"
                          onClick={() => handleRemoveImage('background')}
                        >
                          <X className="h-3 w-3 mr-2" />
                          Clear
                        </Button>
                      )}
                    </div>
                    <input
                      id="bgInput"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'background')}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Primary Color */}
          <Card className="border-gray-100 shadow-sm">
             <CardHeader className="bg-gray-50/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                <Palette className="h-4 w-4" />
                Brand Color
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-8 gap-2">
                  {['#2563eb', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16',
                    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316',
                    '#f59e0b', '#eab308', '#d97706', '#b45309', '#78350f', '#1f2937', '#374151', '#4b5563']
                    .map((color) => (
                    <button
                      key={color}
                      onClick={() => setSettings({...settings, primaryColor: color})}
                      className="relative w-full aspect-square rounded-lg border border-gray-100 hover:scale-110 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ backgroundColor: color }}
                    >
                      {settings.primaryColor === color && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow-md" strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="color"
                    value={settings.primaryColor || '#2563eb'}
                    onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                    className="h-10 w-16 rounded-xl cursor-pointer border border-gray-100 bg-white p-1"
                  />
                  <Input
                    value={settings.primaryColor || ''}
                    onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                    className="flex-1 font-mono text-sm h-10 border-gray-100 uppercase tracking-tighter font-bold"
                  />
                </div>
            </CardContent>
          </Card>
        </div>

        {/* Text Customization & Preview */}
        <div className="space-y-6">
          <Card className="border-gray-100 shadow-sm">
             <CardHeader className="bg-gray-50/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                <Type className="h-4 w-4" />
                Messaging
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Login View Title</label>
                <Input
                  value={settings.loginTitle || ''}
                  onChange={(e) => setSettings({...settings, loginTitle: e.target.value})}
                  placeholder="Welcome Back"
                  className="font-bold border-gray-100 h-10"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Login View Subtitle</label>
                <Input
                  value={settings.loginSubtitle || ''}
                  onChange={(e) => setSettings({...settings, loginSubtitle: e.target.value})}
                  placeholder="Sign in to your account"
                  className="text-xs font-medium border-gray-100 h-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Exact Preview */}
          <Card className="relative overflow-hidden group border-white shadow-2xl ring-1 ring-gray-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-black text-gray-400">
                <Monitor className="h-4 w-4" />
                Exact Preview
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50"
                onClick={() => setShowFullPreview(true)}
              >
                <Maximize2 className="h-3 w-3 mr-1.5" />
                Fullscreen
              </Button>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="relative rounded-2xl overflow-hidden scale-90 -m-4 sm:-m-8 border border-gray-100 shadow-xl shadow-blue-500/5 transition-all group-hover:scale-100 group-hover:m-0 duration-700">
                <LoginPageView 
                  settings={settings as any} 
                  companyName={companyName} 
                />
                <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-white shadow-lg text-[8px] font-black uppercase tracking-widest text-gray-500">
                  Live Sync Active
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full Screen Preview Modal */}
      {showFullPreview && (
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
          <LoginPageView 
            settings={settings as any} 
            companyName={companyName}
            isFullScreen
          />
          <Button
            className="fixed top-8 right-8 z-[110] bg-white/20 backdrop-blur-md hover:bg-white/40 text-white border-white/20 rounded-full h-12 w-12 p-0 shadow-2xl active:scale-90 transition-all hover:rotate-90"
            onClick={() => setShowFullPreview(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="fixed bottom-8 left-8 z-[110] bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white/80 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
             <div className="flex items-center gap-2 pr-4 border-r border-white/20">
                <Monitor className="h-4 w-4" />
                <span>1920 × 1080</span>
             </div>
             <div className="text-white">
                Production Preview
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
