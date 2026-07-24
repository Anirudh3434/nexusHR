"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getSettings, updateSettings, Settings } from "../../../services/settingsService";
import { 
  Palette, 
  ShieldCheck, 
  Mail, 
  Loader2,
  Settings as SettingsIcon
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

// Sub-sections
import { BrandingSection } from "../../../components/settings/BrandingSection";
import { AttendanceSection } from "../../../components/settings/AttendanceSection";
import { EmailSection } from "../../../components/settings/EmailSection";

type TabType = 'branding' | 'attendance' | 'email';

function SettingsContent() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tab = searchParams.get('tab') as TabType || 'branding';

  const [settings, setSettings] = useState<Settings>({
    logo: null,
    loginBackground: null,
    loginBackgroundColor: '#ffffff',
    primaryColor: '#2563eb',
    loginTitle: 'Welcome Back',
    loginSubtitle: 'Sign in to your account',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [companySettings, setCompanySettings] = useState({
    enableGeoFencing: true,
    geoFenceRadius: 100,
    officeLocation: {
      latitude: 0,
      longitude: 0,
      address: '',
    }
  });
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [isCompanySaving, setIsCompanySaving] = useState(false);

  const canManage = hasRole(["admin", "hr"]);

  useEffect(() => {
    if (user?.companyId) {
      fetchSettings();
      fetchCompanySettings();
    }
  }, [user]);

  const fetchCompanySettings = async () => {
    try {
      setIsCompanyLoading(true);
      const response = await fetch(`/api/company/settings?companyId=${user!.companyId}`);
      if (response.ok) {
        const data = await response.json();
        setCompanySettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch company settings:", error);
    } finally {
      setIsCompanyLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await getSettings({ companyId: user!.companyId! });
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch branding settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!user?.companyId) return;
    setIsSaving(true);
    try {
      await updateSettings({
        ...settings,
        companyId: user.companyId,
        updatedBy: user.id || '',
      });
      addToast({ type: 'success', title: 'Saved', description: 'Branding updated successfully' });
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to update branding' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!user?.companyId) return;
    setIsCompanySaving(true);
    try {
      const response = await fetch('/api/company/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: user.companyId,
          ...companySettings,
        }),
      });
      if (!response.ok) throw new Error('Failed to update company settings');
      addToast({ type: 'success', title: 'Updated', description: 'Attendance rules refined' });
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to update attendance' });
    } finally {
      setIsCompanySaving(false);
    }
  };

  const setTab = (newTab: TabType) => {
    router.push(`/settings?tab=${newTab}`);
  };

  if (!user || !canManage) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
       <ShieldCheck className="h-8 w-8 text-red-500 mb-4" />
       <h1 className="text-lg font-semibold text-gray-900">Access Restricted</h1>
       <p className="text-gray-500 text-sm mt-2">Administrator privileges required.</p>
    </div>
  );

  if (isLoading || isCompanyLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const menuItems = [
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'attendance', label: 'Attendance', icon: ShieldCheck },
    { id: 'email', label: 'Email', icon: Mail },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Sidebar */}
      <aside className="w-full lg:w-44 flex-shrink-0">
        <div className="flex items-center gap-2 mb-4 px-2">
          <SettingsIcon className="h-4 w-4 text-gray-700" />
          <h1 className="text-base font-semibold text-gray-900">Settings</h1>
        </div>

        <nav className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id as TabType)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                  isActive 
                  ? 'bg-gray-100 text-gray-900 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="bg-white rounded-lg border border-gray-200 p-4 min-h-[500px]">
          {tab === 'branding' && (
            <BrandingSection 
              settings={settings} 
              setSettings={setSettings} 
              onSave={handleSaveBranding}
              isSaving={isSaving}
              companyName={companySettings.officeLocation.address.split(',')[0] || "NexusHR"}
            />
          )}
          
          {tab === 'attendance' && (
            <AttendanceSection 
              companySettings={companySettings}
              setCompanySettings={setCompanySettings}
              onSave={handleSaveAttendance}
              isSaving={isCompanySaving}
            />
          )}

          {tab === 'email' && (
            <EmailSection 
              companyId={user.companyId || ''}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default function SettingsHub() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
