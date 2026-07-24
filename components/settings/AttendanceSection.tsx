"use client";

import React from "react";
import { 
  Loader2, 
  MapPin, 
  MapPinOff, 
  Save
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GeoFencePicker } from "@/components/ui/GeoFencePicker";

interface CompanySettings {
  enableGeoFencing: boolean;
  geoFenceRadius: number;
  officeLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface AttendanceSectionProps {
  companySettings: CompanySettings;
  setCompanySettings: (settings: CompanySettings) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export function AttendanceSection({ 
  companySettings, 
  setCompanySettings, 
  onSave, 
  isSaving 
}: AttendanceSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Attendance Settings</h2>
        <Button onClick={onSave} disabled={isSaving} size="sm">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>

      {/* Geo-fencing Toggle */}
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {companySettings.enableGeoFencing ? 
            <MapPin className="h-5 w-5 text-blue-600" /> : 
            <MapPinOff className="h-5 w-5 text-gray-400" />
          }
          <div>
            <p className="font-medium text-gray-900">Geo-fencing</p>
            <p className="text-sm text-gray-500">Require employees to be at office location</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer"
            checked={companySettings.enableGeoFencing}
            onChange={(e) => setCompanySettings({...companySettings, enableGeoFencing: e.target.checked})}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Map Section */}
      {companySettings.enableGeoFencing && (
        <div className="pt-2">
          <p className="text-sm font-medium text-gray-700 mb-3">Office Location</p>
          <GeoFencePicker
            latitude={companySettings.officeLocation?.latitude?.toString() || ''}
            longitude={companySettings.officeLocation?.longitude?.toString() || ''}
            radius={companySettings.geoFenceRadius}
            onLocationChange={(lat, lng) => {
              setCompanySettings({
                ...companySettings,
                officeLocation: {
                  ...companySettings.officeLocation,
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lng),
                }
              });
            }}
            onRadiusChange={(radius) => {
              setCompanySettings({
                ...companySettings,
                geoFenceRadius: radius
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
