"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Loader2, Link, AtSign, Globe, MapPin, Phone, Calendar, Edit2, Save, X, User, Building, Briefcase, Camera, Trash2 } from "lucide-react";
import { uploadImage } from "../../../services/uploadService";

interface ProfileData {
  name: string;
  email: string;
  role: string;
  department: string;
  designation: string;
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
      addToast({ type: 'success', title: 'Success', description: 'Profile updated successfully' });
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'error', title: 'Error', description: 'Please upload an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', title: 'Error', description: 'Image size should be less than 5MB' });
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadImage(file, 'hrm/avatars');
      setFormData({...formData, avatar: result.secure_url});
      addToast({ type: 'success', title: 'Success', description: 'Profile picture uploaded' });
    } catch (error) {
      console.error('Upload error:', error);
      addToast({ type: 'error', title: 'Error', description: 'Failed to upload image' });
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 px-4 sm:px-6 lg:px-8">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
          <p className="text-gray-500">Manage your personal information and preferences.</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Profile Header Card with Large Avatar */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-32"></div>
        <CardContent className="relative -mt-16 pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            {/* Large Profile Picture */}
            <div className="relative group">
              <div className="h-32 w-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                {(formData.avatar || profile?.avatar) ? (
                  <img 
                    src={formData.avatar || profile?.avatar} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-4xl">
                    {profile?.name?.charAt(0)}
                  </div>
                )}
              </div>
              
              {/* Upload Button - Always visible on hover, visible when editing */}
              <div className={`absolute -bottom-1 -right-1 flex gap-1 transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                  type="button"
                  onClick={() => document.getElementById('avatarInput')?.click()}
                  disabled={isUploading}
                  className="h-10 w-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 shadow-lg transition-colors"
                >
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                </button>
                {(formData.avatar || profile?.avatar) && isEditing && (
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, avatar: undefined})}
                    className="h-10 w-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <input
                id="avatarInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            
            {/* Name and Title */}
            <div className="flex-1 pt-4 md:pt-6 md:pb-2">
              {isEditing ? (
                <div className="space-y-2 max-w-md">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Your name"
                  />
                </div>
              ) : (
                <div className="mt-8 md:mt-10">
                  <h1 className="text-3xl font-bold text-gray-900">{profile?.name}</h1>
                  <p className="text-lg text-gray-500 capitalize mt-2">{profile?.designation || profile?.role} {profile?.department ? `• ${profile.department}` : ""}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your personal details and contact information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">Bio</label>
            {isEditing ? (
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell us about yourself..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                maxLength={500}
              />
            ) : (
              <p className="text-gray-700">{profile?.bio || "No bio added yet."}</p>
            )}
          </div>

          {/* Grid Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            {/* Date of Birth - Editable */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date of Birth
              </label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.dob ? new Date(formData.dob).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({...formData, dob: e.target.value})}
                />
              ) : (
                <p className="font-medium">{formatDate(profile?.dob)}</p>
              )}
            </div>

            {/* Phone - Editable */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone
              </label>
              {isEditing ? (
                <Input
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+91 98765 43210"
                />
              ) : (
                <p className="font-medium">{profile?.phone || '-'}</p>
              )}
            </div>

            {/* Email - Read Only */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <AtSign className="h-3 w-3" /> Email Address
              </label>
              <p className="font-medium text-gray-700">{profile?.email}</p>
              <p className="text-xs text-gray-400">Cannot be changed</p>
            </div>

            {/* Role - Read Only */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <User className="h-3 w-3" /> System Role
              </label>
              <p className="font-medium capitalize">{profile?.role}</p>
              <p className="text-xs text-gray-400">Managed by admin</p>
            </div>

            {/* Department - Read Only */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Building className="h-3 w-3" /> Department
              </label>
              <p className="font-medium">{profile?.department || '-'}</p>
              <p className="text-xs text-gray-400">Managed by admin</p>
            </div>

            {/* Designation - Read Only */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Designation
              </label>
              <p className="font-medium">{profile?.designation || '-'}</p>
              <p className="text-xs text-gray-400">Managed by admin</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Street Address</label>
                <Input
                  value={formData.address?.street || ''}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <label className="text-sm font-medium">City</label>
                <Input
                  value={formData.address?.city || ''}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                  placeholder="Mumbai"
                />
              </div>
              <div>
                <label className="text-sm font-medium">State</label>
                <Input
                  value={formData.address?.state || ''}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                  placeholder="Maharashtra"
                />
              </div>
              <div>
                <label className="text-sm font-medium">ZIP Code</label>
                <Input
                  value={formData.address?.zipCode || ''}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, zipCode: e.target.value}})}
                  placeholder="400001"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <Input
                  value={formData.address?.country || 'India'}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                  placeholder="India"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {profile?.address?.street ? (
                <>
                  <p>{profile.address.street}</p>
                  <p>{profile.address.city}, {profile.address.state} {profile.address.zipCode}</p>
                  <p>{profile.address.country || 'India'}</p>
                </>
              ) : (
                <p className="text-gray-400">No address added</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Links Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Social Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GitHub */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Link className="h-3 w-3" /> GitHub
              </label>
              {isEditing ? (
                <Input
                  value={formData.github || ''}
                  onChange={(e) => setFormData({...formData, github: e.target.value})}
                  placeholder="github.com/username"
                />
              ) : (
                <p className="font-medium">
                  {profile?.github ? (
                    <a href={`https://${profile.github}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {profile.github}
                    </a>
                  ) : '-'}
                </p>
              )}
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Link className="h-3 w-3" /> LinkedIn
              </label>
              {isEditing ? (
                <Input
                  value={formData.linkedin || ''}
                  onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                  placeholder="linkedin.com/in/username"
                />
              ) : (
                <p className="font-medium">
                  {profile?.linkedin ? (
                    <a href={`https://${profile.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {profile.linkedin}
                    </a>
                  ) : '-'}
                </p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Globe className="h-3 w-3" /> Website
              </label>
              {isEditing ? (
                <Input
                  value={formData.website || ''}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="yourwebsite.com"
                />
              ) : (
                <p className="font-medium">
                  {profile?.website ? (
                    <a href={`https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {profile.website}
                    </a>
                  ) : '-'}
                </p>
              )}
            </div>

            {/* Twitter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Link className="h-3 w-3" /> Twitter
              </label>
              {isEditing ? (
                <Input
                  value={formData.twitter || ''}
                  onChange={(e) => setFormData({...formData, twitter: e.target.value})}
                  placeholder="twitter.com/username"
                />
              ) : (
                <p className="font-medium">
                  {profile?.twitter ? (
                    <a href={`https://${profile.twitter}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {profile.twitter}
                    </a>
                  ) : '-'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
