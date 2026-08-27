"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { 
  Building2, 
  User, 
  MapPin, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  MapPinned, 
  Landmark, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { GeoFencePicker } from "@/components/ui/GeoFencePicker";

interface CompanyData {
  name: string;
  code: string;
  email: string;
  phone: string;
  website: string;
  logo: string | null;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  gstNumber: string;
  panNumber: string;
  officeLatitude: string;
  officeLongitude: string;
  officeAddress: string;
  geoFenceRadius: number;
  enableGeoFencing: boolean;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
}

const generate6CharID = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
};

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredCompanyCode, setRegisteredCompanyCode] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [data, setData] = useState<CompanyData>(() => ({
    name: "",
    code: generate6CharID(),
    email: "",
    phone: "",
    website: "",
    logo: null,
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    gstNumber: "",
    panNumber: "",
    officeLatitude: "",
    officeLongitude: "",
    officeAddress: "",
    geoFenceRadius: 100,
    enableGeoFencing: true,
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
  }));

  const handleInputChange = (field: keyof CompanyData, value: string | boolean | number) => {
    setData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Logo image size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const steps = [
    { title: "Company Details", description: "Basic company information" },
    { title: "Address & Tax", description: "Location & tax details" },
    { title: "Office Location", description: "Geo-fencing for attendance" },
    { title: "Admin Account", description: "Master admin credentials" },
  ];

  const validateStep = (step: number) => {
    switch (step) {
      case 0:
        if (!data.name.trim()) return setError("Company name is required"), false;
        if (!data.code.trim()) return setError("6-character Company ID is required"), false;
        if (data.code.trim().length !== 6) return setError("Company ID must be exactly 6 alphanumeric characters"), false;
        if (!data.email.trim()) return setError("Email address is required"), false;
        if (!data.phone.trim()) return setError("Phone number is required"), false;
        break;
      case 1:
        if (!data.street.trim()) return setError("Street address is required"), false;
        if (!data.city.trim()) return setError("City is required"), false;
        if (!data.state.trim()) return setError("State is required"), false;
        if (!data.zipCode.trim()) return setError("ZIP/PIN code is required"), false;
        break;
      case 2:
        if (!data.officeAddress.trim()) return setError("Office address is required"), false;
        break;
      case 3:
        if (!data.adminName.trim()) return setError("Admin name is required"), false;
        if (!data.adminEmail.trim()) return setError("Admin email is required"), false;
        if (!data.adminPassword) return setError("Password is required"), false;
        if (data.adminPassword.length < 8) return setError("Password must be at least 8 characters"), false;
        if (data.adminPassword !== data.confirmPassword) return setError("Passwords do not match"), false;
        break;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    setError(null);
  };

  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setData(prev => ({
            ...prev,
            officeLatitude: position.coords.latitude.toString(),
            officeLongitude: position.coords.longitude.toString(),
          }));
        },
        (err) => {
          setError("Could not retrieve your location. Please enter manually.");
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      // Registration successful
      setCurrentStep(steps.length); // Show success screen
      const companyCode = result.company?.code || data.code.toUpperCase();
      setRegisteredCompanyCode(companyCode);

      // Store in cookies for 1-time setup memory
      if (typeof document !== "undefined") {
        document.cookie = `nexushr_company_code=${encodeURIComponent(companyCode)}; path=/; max-age=31536000; SameSite=Lax`;
        localStorage.setItem("nexushr_company_code", companyCode);
      }
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (typeof navigator !== "undefined" && registeredCompanyCode) {
      navigator.clipboard.writeText(registeredCompanyCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // Success Screen
  if (currentStep >= steps.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-2xl border-indigo-100 rounded-3xl p-2 bg-white">
          <CardContent className="pt-8 pb-8 space-y-5">
            <div className="h-20 w-20 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-slate-900">Registration Complete!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your organization is configured and ready for your team.
              </p>
            </div>

            {/* Prominent 6-Character ID Display Box */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl space-y-2 border border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                Your Unique 6-Character Company ID
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-black tracking-widest text-white font-mono bg-slate-800 px-4 py-1.5 rounded-xl border border-slate-700">
                  {registeredCompanyCode || data.code.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md active:scale-95"
                  title="Copy Company ID"
                >
                  {copiedCode ? <Check className="h-5 w-5 text-emerald-300" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                {copiedCode ? "✓ Copied to clipboard!" : "Saved in your browser cookies. Employees use this ID to sign in."}
              </p>
            </div>

            <Button 
              onClick={() => {
                const nameSlug = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || registeredCompanyCode;
                router.push(`/${nameSlug}`);
              }} 
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white font-bold shadow-lg shadow-indigo-600/25"
            >
              Enter Workspace Portal
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#03081c] p-2 shadow-xl shadow-[#03081c]/20 border border-[#03081c]">
            <img 
              src="/logo.png" 
              alt="NexusHR Logo" 
              className="h-full w-full object-contain scale-105" 
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Register Your Company</h1>
          <p className="text-gray-600">Complete the 4-step process to set up your company</p>
        </div>

        {/* Stepper */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Stepper steps={steps} currentStep={currentStep} />
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Form Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 0 && <Building2 className="h-5 w-5 text-blue-600" />}
              {currentStep === 1 && <Landmark className="h-5 w-5 text-blue-600" />}
              {currentStep === 2 && <MapPinned className="h-5 w-5 text-blue-600" />}
              {currentStep === 3 && <User className="h-5 w-5 text-blue-600" />}
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription>
              {currentStep === 0 && "Enter your company basic information"}
              {currentStep === 1 && "Provide address and tax details"}
              {currentStep === 2 && "Set up office location for geo-fenced attendance"}
              {currentStep === 3 && "Create your admin account"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Step 1: Company Info */}
            {currentStep === 0 && (
              <div className="space-y-6">
                {/* Logo Upload */}
                <div className="flex items-center gap-4">
                  <div 
                    className="h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {data.logo ? (
                      <img src={data.logo} alt="Logo preview" className="h-full w-full object-contain rounded-lg" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">Upload Logo</span>
                      </>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-1">Company Logo</p>
                    <p className="text-xs text-gray-500 mb-2">Recommended: 200x200px, PNG or JPG, max 2MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    {data.logo && (
                      <button
                        type="button"
                        onClick={() => setData(prev => ({ ...prev, logo: null }))}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <Input
                      value={data.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Acme Corporation"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        6-Character Company ID *
                      </label>
                      <button
                        type="button"
                        onClick={() => handleInputChange('code', generate6CharID())}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        title="Generate a new 6-character ID"
                      >
                        <RefreshCw className="h-3 w-3" /> Regenerate
                      </button>
                    </div>
                    <Input
                      value={data.code}
                      onChange={(e) => handleInputChange('code', e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="e.g., NX8K2P"
                      maxLength={6}
                      className="uppercase font-mono font-bold tracking-widest"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Unique 6-character code used by your employees to log in.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        value={data.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="company@example.com"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <Input
                      value={data.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <Input
                    value={data.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Address & Tax */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <Input
                    value={data.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    placeholder="123, Business Park, Main Road"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <Input
                      value={data.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Mumbai"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <Input
                      value={data.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP / PIN Code *
                    </label>
                    <Input
                      value={data.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder="400001"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GST Number
                    </label>
                    <div className="relative">
                      <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={data.gstNumber}
                        onChange={(e) => handleInputChange('gstNumber', e.target.value.toUpperCase())}
                        placeholder="27AABCU9603R1ZM"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">15 character GSTIN format</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PAN Number
                    </label>
                    <Input
                      value={data.panNumber}
                      onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                      placeholder="AABCU9603R"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Office Location */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Geo-Fencing Setup</h4>
                      <p className="text-sm text-blue-700">
                        Click on the map or drag the marker to set your office location. 
                        Employees will only be able to mark attendance when within the specified radius.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interactive Geo-Fencing Map */}
                <GeoFencePicker
                  latitude={data.officeLatitude}
                  longitude={data.officeLongitude}
                  onLocationChange={(lat, lng) => {
                    setData(prev => ({
                      ...prev,
                      officeLatitude: lat,
                      officeLongitude: lng,
                    }));
                  }}
                  radius={data.geoFenceRadius}
                  onRadiusChange={(radius) => handleInputChange('geoFenceRadius', radius)}
                />

                {/* Manual Coordinate Inputs */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Office Latitude *
                    </label>
                    <Input
                      value={data.officeLatitude}
                      onChange={(e) => handleInputChange('officeLatitude', e.target.value)}
                      placeholder="Click on map or search above"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Office Longitude *
                    </label>
                    <Input
                      value={data.officeLongitude}
                      onChange={(e) => handleInputChange('officeLongitude', e.target.value)}
                      placeholder="Click on map or search above"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Office Address *
                  </label>
                  <textarea
                    value={data.officeAddress}
                    onChange={(e) => handleInputChange('officeAddress', e.target.value)}
                    placeholder="Complete office address for attendance location"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.enableGeoFencing}
                      onChange={(e) => handleInputChange('enableGeoFencing', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable Geo-Fencing</span>
                  </label>
                </div>

                {data.enableGeoFencing && data.officeLatitude && data.officeLongitude && (
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      <strong>Preview:</strong> Attendance will be allowed within{" "}
                      <span className="font-semibold text-blue-600">{data.geoFenceRadius} meters</span>{" "}
                      of the marked location on the map.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Admin Account */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900 mb-1">Create Admin Account</h4>
                      <p className="text-sm text-yellow-700">
                        This will be the primary administrator account for your company with full access to all features.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <Input
                    value={data.adminName}
                    onChange={(e) => handleInputChange('adminName', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      value={data.adminEmail}
                      onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                      placeholder="admin@yourcompany.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={data.adminPassword}
                      onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={data.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Re-enter your password"
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Complete Registration
                </>
              )}
            </Button>
          )}
        </div>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
