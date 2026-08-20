"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
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
  }, [user]);

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-xs font-semibold text-gray-400">Loading Profile Details...</p>
      </div>
    );
  }

  const currentAvatar = formData.avatar || profile?.avatar;
  const displayName = profile?.name || user?.name || "Employee";
  const displayRole = profile?.designation || profile?.role || "Software Developer";
  const displayEmpId = profile?.employeeId || (user as any)?.employeeId || "—";
  const displayDepartment = profile?.department || (user as any)?.department || "Engineering";

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-16">
      
      {/* 1. Profile Hero Card with Banner & Avatar Layout */}
      <div className="rounded-3xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 shadow-sm">
        
        {/* Banner Cover with Vibrant Gradient */}
        <div className="relative h-44 sm:h-52 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/30" />
        </div>

        {/* Profile Identity & Action Bar */}
        <div className="px-6 sm:px-8 pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-2">
            
            {/* Left: Avatar + Title Details */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
              
              {/* Avatar with Glow Ring (Only element with -mt) */}
              <div className="relative group shrink-0 -mt-16 sm:-mt-20">
                <div className="p-1 rounded-full bg-white dark:bg-gray-900 shadow-xl">
                  <div className="p-1 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600">
                    {currentAvatar ? (
                      <img 
                        src={currentAvatar} 
                        alt={displayName} 
                        className="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover border-2 border-white dark:border-gray-900 shadow-sm"
                      />
                    ) : (
                      <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-4xl border-2 border-white dark:border-gray-900 shadow-inner">
                        {displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera upload trigger button */}
                <div className={`absolute bottom-1 right-1 flex gap-1 transition-all ${isEditing ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'}`}>
                  <button
                    type="button"
                    onClick={() => document.getElementById('avatarUploadInput')?.click()}
                    disabled={isUploading}
                    className="h-8 w-8 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
                    title="Change Photo"
                  >
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  </button>
                  {currentAvatar && isEditing && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: undefined })}
                      className="h-8 w-8 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
                      title="Remove Photo"
                    >
                      <Trash2 size={14} />
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

              {/* Title & Role Info (Crisply placed in white body) */}
              <div className="pt-2 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {displayName}
                  </h1>
                </div>

                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center justify-center sm:justify-start gap-2">
                  <span>{displayRole}</span>
                  <span>•</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{displayDepartment}</span>
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1.5">
                  <button 
                    onClick={() => copyToClipboard(displayEmpId, "Employee ID")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-mono font-bold transition-colors"
                  >
                    <span>ID: #{displayEmpId}</span>
                    <Copy size={11} className="text-gray-400" />
                  </button>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Employee
                  </span>
                </div>
              </div>

            </div>

            {/* Right: Edit Profile / Save Changes CTA */}
            <div className="flex items-center justify-center sm:justify-end gap-3 pb-1">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                >
                  <Edit3 size={15} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all"
                  >
                    <X size={15} />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
                  >
                    {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    <span>Save Changes</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Quick Metric Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Department</span>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate mt-0.5">{displayDepartment}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Designation</span>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate mt-0.5">{displayRole}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Joining Date</span>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate mt-0.5">{formatDate(profile?.joiningDate)}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Account Type</span>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400 capitalize truncate mt-0.5">{profile?.role || "Employee"}</p>
            </div>
          </div>

        </div>
      </div>


      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 dark:bg-gray-800/60 rounded-2xl border border-gray-200/60 dark:border-gray-800 max-w-fit flex-wrap">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-xs' 
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
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
            <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <Sparkles size={16} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">About & Bio</h3>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={formData.bio || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Write a brief professional summary about your role, skills, and goals..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[140px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-[10px] text-gray-400 text-right">{(formData.bio?.length || 0)}/500 characters</p>
                </div>
              ) : (
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic">
                  {profile?.bio ? `"${profile.bio}"` : "No personal bio provided yet. Click 'Edit Profile' to add a summary."}
                </p>
              )}
            </div>

            {/* Contact Details (2 cols) */}
            <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                    <User size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Personal Information</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Full Legal Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  ) : (
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{displayName}</p>
                  )}
                </div>

                {/* Email (Read Only) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                  <p className="font-mono font-semibold text-gray-800 dark:text-gray-200 text-xs py-2">{profile?.email || user?.email}</p>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  ) : (
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{profile?.phone || 'Not added'}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date of Birth</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.dob ? new Date(formData.dob).toISOString().split('T')[0] : ''}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  ) : (
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{formatDate(profile?.dob)}</p>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}


        {/* TAB 2: Employment Details */}
        {activeTab === 'work' && (
          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600">
                  <Building2 size={16} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Employment & Organizational Record</h3>
              </div>
              <span className="text-xs text-gray-400">Managed by Organization HR</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              
              <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Department</span>
                <p className="text-base font-extrabold text-gray-900 dark:text-white">{displayDepartment}</p>
                <p className="text-[11px] text-gray-400">Primary functional team</p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Designation</span>
                <p className="text-base font-extrabold text-gray-900 dark:text-white">{displayRole}</p>
                <p className="text-[11px] text-gray-400">Assigned role in hierarchy</p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Employee ID</span>
                <p className="text-base font-extrabold font-mono text-blue-600 dark:text-blue-400">#{displayEmpId}</p>
                <p className="text-[11px] text-gray-400">Official company identifier</p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Date of Joining</span>
                <p className="text-base font-extrabold text-gray-900 dark:text-white">{formatDate(profile?.joiningDate)}</p>
                <p className="text-[11px] text-gray-400">Contract start timeline</p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">System Access Level</span>
                <p className="text-base font-extrabold capitalize text-purple-600 dark:text-purple-400">{profile?.role || "Employee"}</p>
                <p className="text-[11px] text-gray-400">RBAC permissions profile</p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reporting Manager</span>
                <p className="text-base font-extrabold text-gray-900 dark:text-white">Sunil Singh</p>
                <p className="text-[11px] text-gray-400">CTO & Co-founder</p>
              </div>

            </div>
          </div>
        )}


        {/* TAB 3: Residential Address */}
        {activeTab === 'address' && (
          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <MapPin size={16} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Residential Address</h3>
              </div>
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Street Address</label>
                  <input
                    type="text"
                    value={formData.address?.street || ''}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                    placeholder="e.g. 102 Cyber Park Avenue"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">City</label>
                  <input
                    type="text"
                    value={formData.address?.city || ''}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                    placeholder="e.g. New Delhi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">State / Province</label>
                  <input
                    type="text"
                    value={formData.address?.state || ''}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                    placeholder="e.g. Delhi NCR"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Postal / ZIP Code</label>
                  <input
                    type="text"
                    value={formData.address?.zipCode || ''}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                    placeholder="e.g. 110001"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Country</label>
                  <input
                    type="text"
                    value={formData.address?.country || 'India'}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                    placeholder="India"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-800 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                  <MapPin size={20} />
                </div>
                <div className="space-y-1 text-xs">
                  {profile?.address?.street ? (
                    <>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{profile.address.street}</p>
                      <p className="text-gray-600 dark:text-gray-300 font-medium">
                        {profile.address.city}, {profile.address.state} {profile.address.zipCode}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 font-semibold">{profile.address.country || 'India'}</p>
                    </>
                  ) : (
                    <p className="text-gray-400 italic">No address on file. Click 'Edit Profile' to add your residence details.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}


        {/* TAB 4: Portfolios & Socials */}
        {activeTab === 'social' && (
          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600">
                  <Globe size={16} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Online Portfolios & Profiles</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              
              {/* GitHub */}
              <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                  <span className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-mono text-[10px]">GH</span>
                  <span>GitHub Profile</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.github || ''}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    placeholder="github.com/username"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono"
                  />
                ) : (
                  profile?.github ? (
                    <a href={`https://${profile.github.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-mono font-semibold hover:underline flex items-center gap-1">
                      {profile.github} <ExternalLink size={11} />
                    </a>
                  ) : <span className="text-gray-400 italic">Not provided</span>
                )}
              </div>

              {/* LinkedIn */}
              <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                  <span className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-mono text-[10px]">in</span>
                  <span>LinkedIn</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.linkedin || ''}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="linkedin.com/in/username"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono"
                  />
                ) : (
                  profile?.linkedin ? (
                    <a href={`https://${profile.linkedin.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-mono font-semibold hover:underline flex items-center gap-1">
                      {profile.linkedin} <ExternalLink size={11} />
                    </a>
                  ) : <span className="text-gray-400 italic">Not provided</span>
                )}
              </div>

              {/* Website */}
              <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                  <Globe size={16} className="text-emerald-600" />
                  <span>Personal Website / Portfolio</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="yourwebsite.dev"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono"
                  />
                ) : (
                  profile?.website ? (
                    <a href={`https://${profile.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-mono font-semibold hover:underline flex items-center gap-1">
                      {profile.website} <ExternalLink size={11} />
                    </a>
                  ) : <span className="text-gray-400 italic">Not provided</span>
                )}
              </div>

              {/* Twitter */}
              <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                  <span className="p-1 rounded-md bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 font-mono text-[10px]">𝕏</span>
                  <span>Twitter / X</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.twitter || ''}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="x.com/username"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono"
                  />
                ) : (
                  profile?.twitter ? (
                    <a href={`https://${profile.twitter.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-mono font-semibold hover:underline flex items-center gap-1">
                      {profile.twitter} <ExternalLink size={11} />
                    </a>
                  ) : <span className="text-gray-400 italic">Not provided</span>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
