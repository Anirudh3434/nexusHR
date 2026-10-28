"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { Button } from "../../../components/ui/Button";
import { 
  Loader2, 
  Globe, 
  MapPin, 
  Phone, 
  Calendar, 
  Edit3, 
  Save, 
  X, 
  User, 
  Building2, 
  Briefcase, 
  Camera, 
  Trash2, 
  Mail, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  Clock, 
  Award,
  ExternalLink,
  Link as LinkIcon
} from "lucide-react";
import { uploadImage } from "../../../services/uploadService";
import { cn } from "../../../lib/utils";

interface ProfileData {
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
  employeeId?: string;
  dob?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  bio?: string;
  github?: string;
  linkedin?: string;
  website?: string;
  twitter?: string;
  avatar?: string;
  joiningDate?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'work' | 'address' | 'social'>('personal');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});

  useEffect(() => {
    if (user) fetchProfile();
  }, [user?.id]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/profile?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      setProfile(data);
      setFormData(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          ...formData,
        }),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const data = await response.json();
      setProfile(data.user);
      setIsEditing(false);
      addToast({ type: 'success', title: 'Profile Updated', description: 'Your profile changes have been saved.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile || {});
    setIsEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: 'Invalid File', description: 'Please select an image file.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', title: 'File Too Large', description: 'Image size must be less than 5MB.' });
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadImage(file, 'hrm');
      setFormData({ ...formData, avatar: result.secure_url });
      addToast({ type: 'success', title: 'Avatar Uploaded', description: 'Click "Save Changes" to apply.' });
    } catch (error: any) {
      console.error('Upload error:', error);
      addToast({ type: 'error', title: 'Upload Failed', description: error.message || 'Failed to upload image' });
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast({ type: 'info', title: 'Copied', description: `${label} copied to clipboard.` });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not specified';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-medium text-muted-foreground">Loading profile details...</p>
      </div>
    );
  }

  const currentAvatar = formData.avatar || profile?.avatar;
  const displayName = profile?.name || user?.name || "Employee";
  const displayRole = profile?.designation || profile?.role || "Software Developer";
  const displayEmpId = profile?.employeeId || (user as any)?.employeeId || "—";
  const displayDepartment = profile?.department || (user as any)?.department || "Engineering";

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16">
      
      {/* 1. Profile Hero Card */}
      <div className="rounded-[14px] overflow-hidden border border-border bg-card text-card-foreground shadow-xs">
        
        {/* Refined Harbor & Pine Architectural Banner */}
        <div className="relative h-36 sm:h-44 w-full bg-[#0b1220] overflow-hidden border-b border-border">
          {/* Ambient Pine Radial Wash */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(15,118,110,0.35),transparent)]" />
          {/* Subtle Ledger Grid */}
          <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        {/* Profile Identity & Action Bar */}
        <div className="px-6 sm:px-8 pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-0">
            
            {/* Left: Avatar + Title Details */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              
              {/* Avatar Container */}
              <div className="relative group shrink-0 -mt-14 sm:-mt-16">
                <div className="p-1 rounded-full bg-card ring-1 ring-border shadow-md">
                  {currentAvatar ? (
                    <img 
                      src={currentAvatar} 
                      alt={displayName} 
                      className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-3xl">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Camera upload trigger button */}
                <div className={cn(
                  "absolute bottom-0 right-0 flex gap-1 transition-all",
                  isEditing ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100"
                )}>
                  <button
                    type="button"
                    onClick={() => document.getElementById('avatarUploadInput')?.click()}
                    disabled={isUploading}
                    className="h-7 w-7 bg-primary hover:opacity-90 active:scale-95 text-primary-foreground rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer"
                    title="Change Photo"
                  >
                    {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                  </button>
                  {currentAvatar && isEditing && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: undefined })}
                      className="h-7 w-7 bg-destructive hover:opacity-90 active:scale-95 text-destructive-foreground rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer"
                      title="Remove Photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <input
                  id="avatarUploadInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {/* Title & Role Info */}
              <div className="pt-2 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    {displayName}
                  </h1>
                </div>

                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-medium text-foreground">{displayRole}</span>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="text-primary font-medium">{displayDepartment}</span>
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <button 
                    onClick={() => copyToClipboard(displayEmpId, "Employee ID")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground text-xs font-mono font-medium border border-border transition-colors cursor-pointer"
                    title="Click to copy ID"
                  >
                    <span>ID: #{displayEmpId}</span>
                    <Copy size={11} className="text-muted-foreground" />
                  </button>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Active Employee
                  </span>
                </div>
              </div>

            </div>

            {/* Right: Edit Profile / Save Changes CTA */}
            <div className="flex items-center justify-center sm:justify-end gap-2 pb-1">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="gap-2 font-medium"
                >
                  <Edit3 size={14} />
                  <span>Edit Profile</span>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="gap-1.5 font-medium"
                  >
                    <X size={14} />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-1.5 font-medium"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save Changes</span>
                  </Button>
                </div>
              )}
            </div>

          </div>

          {/* Quick Metric Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Department</span>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">{displayDepartment}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Designation</span>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">{displayRole}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Joining Date</span>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">{formatDate(profile?.joiningDate)}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Account Type</span>
              <p className="text-sm font-semibold text-primary capitalize truncate mt-0.5">{profile?.role || "Employee"}</p>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border max-w-fit flex-wrap">
        {[
          { id: 'personal', label: 'Personal & Contact', icon: User },
          { id: 'work', label: 'Employment Details', icon: Building2 },
          { id: 'address', label: 'Residential Address', icon: MapPin },
          { id: 'social', label: 'Portfolios & Socials', icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                isActive 
                  ? "bg-card text-foreground font-semibold shadow-2xs border border-border/70" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={14} className={isActive ? "text-primary" : "text-muted-foreground"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Content Panels */}
      <div className="space-y-6">

        {/* TAB 1: Personal & Contact */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Bio Card (1 col) */}
            <div className="rounded-[14px] border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <Sparkles size={15} />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">About & Bio</h3>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Write a brief professional summary about your role, skills, and goals..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[140px] resize-none"
                      maxLength={500}
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{(formData.bio?.length || 0)}/500 characters</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    {profile?.bio ? `"${profile.bio}"` : "No personal bio provided yet. Click 'Edit Profile' to add a summary."}
                  </p>
                )}
              </div>
            </div>

            {/* Contact Details (2 cols) */}
            <div className="lg:col-span-2 rounded-[14px] border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <User size={15} />
                  </div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">Personal Information</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Full Legal Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  ) : (
                    <p className="font-semibold text-foreground text-sm">{displayName}</p>
                  )}
                </div>

                {/* Email (Read Only) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                  <p className="font-mono text-sm text-foreground py-1">{profile?.email || user?.email}</p>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  ) : (
                    <p className="font-semibold text-foreground text-sm">{profile?.phone || 'Not added'}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date of Birth</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.dob ? new Date(formData.dob).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  ) : (
                    <p className="font-semibold text-foreground text-sm">{formatDate(profile?.dob)}</p>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Employment Details */}
        {activeTab === 'work' && (
          <div className="rounded-[14px] border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Building2 size={15} />
                </div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Employment & Organizational Record</h3>
              </div>
              <span className="text-xs text-muted-foreground">Managed by Organization HR</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              
              <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Department</span>
                <p className="text-base font-semibold text-foreground">{displayDepartment}</p>
                <p className="text-xs text-muted-foreground">Primary functional team</p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Designation</span>
                <p className="text-base font-semibold text-foreground">{displayRole}</p>
                <p className="text-xs text-muted-foreground">Assigned role in hierarchy</p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Employee ID</span>
                <p className="text-base font-semibold font-mono text-primary">#{displayEmpId}</p>
                <p className="text-xs text-muted-foreground">Official company identifier</p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date of Joining</span>
                <p className="text-base font-semibold text-foreground">{formatDate(profile?.joiningDate)}</p>
                <p className="text-xs text-muted-foreground">Contract start timeline</p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">System Access Level</span>
                <p className="text-base font-semibold capitalize text-primary">{profile?.role || "Employee"}</p>
                <p className="text-xs text-muted-foreground">RBAC permissions profile</p>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reporting Status</span>
                <p className="text-base font-semibold text-foreground">Active Organization Member</p>
                <p className="text-xs text-muted-foreground">Assigned to team</p>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: Residential Address */}
        {activeTab === 'address' && (
          <div className="rounded-[14px] border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <MapPin size={15} />
                </div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Residential Address</h3>
              </div>
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Street Address</label>
                  <input
                    type="text"
                    value={formData.address?.street || ''}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                    placeholder="e.g. 102 Cyber Park Avenue"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">City</label>
                  <input
                    type="text"
                    value={formData.address?.city || ''}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                    placeholder="e.g. New Delhi"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">State / Province</label>
                  <input
                    type="text"
                    value={formData.address?.state || ''}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                    placeholder="e.g. Delhi NCR"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Postal / ZIP Code</label>
                  <input
                    type="text"
                    value={formData.address?.zipCode || ''}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                    placeholder="e.g. 110001"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Country</label>
                  <input
                    type="text"
                    value={formData.address?.country || 'India'}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                    placeholder="India"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl border border-border/80 bg-muted/30 flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shrink-0">
                  <MapPin size={18} />
                </div>
                <div className="space-y-1 text-xs">
                  {profile?.address?.street ? (
                    <>
                      <p className="text-sm font-semibold text-foreground">{profile.address.street}</p>
                      <p className="text-muted-foreground font-medium">
                        {profile.address.city}, {profile.address.state} {profile.address.zipCode}
                      </p>
                      <p className="text-muted-foreground font-semibold">{profile.address.country || 'India'}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground italic">No address on file. Click 'Edit Profile' to add your residence details.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Portfolios & Socials */}
        {activeTab === 'social' && (
          <div className="rounded-[14px] border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Globe size={15} />
                </div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Online Portfolios & Profiles</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* GitHub */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <span className="p-1 rounded-md bg-muted border border-border text-foreground font-mono text-[10px]">GH</span>
                  <span>GitHub Profile</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.github || ''}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    placeholder="github.com/username"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  profile?.github ? (
                    <a href={`https://${profile.github.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary font-mono font-medium hover:underline flex items-center gap-1.5">
                      {profile.github} <ExternalLink size={12} />
                    </a>
                  ) : <span className="text-muted-foreground italic">Not provided</span>
                )}
              </div>

              {/* LinkedIn */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <span className="p-1 rounded-md bg-muted border border-border text-foreground font-mono text-[10px]">in</span>
                  <span>LinkedIn</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.linkedin || ''}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="linkedin.com/in/username"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  profile?.linkedin ? (
                    <a href={`https://${profile.linkedin.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary font-mono font-medium hover:underline flex items-center gap-1.5">
                      {profile.linkedin} <ExternalLink size={12} />
                    </a>
                  ) : <span className="text-muted-foreground italic">Not provided</span>
                )}
              </div>

              {/* Website */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Globe size={15} className="text-primary" />
                  <span>Personal Website / Portfolio</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="yourwebsite.dev"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  profile?.website ? (
                    <a href={`https://${profile.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary font-mono font-medium hover:underline flex items-center gap-1.5">
                      {profile.website} <ExternalLink size={12} />
                    </a>
                  ) : <span className="text-muted-foreground italic">Not provided</span>
                )}
              </div>

              {/* Twitter */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <span className="p-1 rounded-md bg-muted border border-border text-foreground font-mono text-[10px]">𝕏</span>
                  <span>Twitter / X</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.twitter || ''}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="x.com/username"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  profile?.twitter ? (
                    <a href={`https://${profile.twitter.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary font-mono font-medium hover:underline flex items-center gap-1.5">
                      {profile.twitter} <ExternalLink size={12} />
                    </a>
                  ) : <span className="text-muted-foreground italic">Not provided</span>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
