"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  MapPin, 
  Navigation, 
  Search, 
  Info, 
  Crosshair, 
  Map as MapIcon,
  Layers,
  Maximize2,
  ZoomIn,
  Move
} from "lucide-react";
import { 
  Map, 
  MapMarker, 
  MapControls, 
  MapCircle, 
  MarkerContent, 
  MarkerLabel,
  MapRef 
} from "./map";
import { Button } from "./Button";
import { Input } from "./Input";
import { cn } from "@/lib/utils";

interface GeoFencePickerProps {
  latitude: string;
  longitude: string;
  onLocationChange: (lat: string, lng: string) => void;
  radius: number;
  onRadiusChange?: (radius: number) => void;
  className?: string;
}

export function GeoFencePicker({
  latitude,
  longitude,
  onLocationChange,
  radius,
  onRadiusChange,
  className
}: GeoFencePickerProps) {
  const mapRef = useRef<MapRef>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const lat = parseFloat(latitude) || 20.5937; // Default: India
  const lng = parseFloat(longitude) || 78.9629;
  
  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
          );
          const results = await response.json();
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Autocomplete failed:", error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSuggestion = (suggestion: any) => {
    const { lat, lon, display_name } = suggestion;
    const newLat = parseFloat(lat);
    const newLon = parseFloat(lon);
    
    onLocationChange(newLat.toFixed(6), newLon.toFixed(6));
    setSearchQuery(display_name);
    setShowSuggestions(false);
    
    mapRef.current?.flyTo({
      center: [newLon, newLat],
      zoom: 16,
      duration: 1200
    });
  };

  const handleMapClick = useCallback((e: any) => {
    const { lng, lat } = e.lngLat;
    onLocationChange(lat.toFixed(6), lng.toFixed(6));
  }, [onLocationChange]);

  const handleDragEnd = useCallback((lngLat: { lng: number; lat: number }) => {
    onLocationChange(lngLat.lat.toFixed(6), lngLat.lng.toFixed(6));
  }, [onLocationChange]);

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          onLocationChange(latitude.toFixed(6), longitude.toFixed(6));
          mapRef.current?.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 1500
          });
        }
      );
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Premium Header Controls with Autocomplete */}
      <div className="flex flex-col sm:flex-row gap-3 relative">
        <div className="relative flex-1" ref={dropdownRef}>
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 2 && setShowSuggestions(true)}
              placeholder="Search address or landmark..."
              className="pl-10 bg-white shadow-sm border-gray-200"
            />
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white/95 backdrop-blur-xl rounded-xl border border-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="py-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors group flex items-start gap-3"
                  >
                    <MapPin className="h-4 w-4 text-gray-400 group-hover:text-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {suggestion.display_name.split(',')[0]}
                      </p>
                      <p className="text-[10px] text-gray-500 line-clamp-1">
                        {suggestion.display_name.split(',').slice(1).join(',').trim()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-medium tracking-tight">Powered by OpenStreetMap</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            className="flex items-center gap-2 bg-white shadow-sm border-gray-200"
          >
            <Navigation className="h-4 w-4 text-blue-600" />
            <span className="hidden sm:inline font-medium">My Location</span>
          </Button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative h-[450px] w-full rounded-2xl border-4 border-white shadow-2xl overflow-hidden group ring-1 ring-gray-200">
        <Map
          ref={mapRef}
          center={[lng, lat]}
          zoom={latitude ? 16 : 4}
          {...{ onClick: handleMapClick } as any}
          className="h-full w-full"
        >
          <MapControls showLocate showZoom showFullscreen position="bottom-right" />
          
          {latitude && longitude && (
            <>
              <MapMarker
                longitude={lng}
                latitude={lat}
                draggable
                onDragEnd={handleDragEnd}
              >
                <MarkerContent className="bg-white p-1 rounded-full shadow-2xl border-2 border-blue-600">
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                </MarkerContent>
                <MarkerLabel className="bg-gray-900 text-white px-2 py-1 rounded-md text-xs font-semibold shadow-lg">
                  Office Center
                </MarkerLabel>
              </MapMarker>
              
              <MapCircle
                center={[lng, lat]}
                radius={radius}
                color="#2563eb"
                opacity={0.12}
                strokeColor="#2563eb"
                strokeWidth={2}
                strokeOpacity={0.6}
              />
            </>
          )}

          {/* Overlay Info Panel */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
             <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-white shadow-xl max-w-[240px] animate-in slide-in-from-left duration-500">
                <div className="flex items-start gap-2.5">
                  <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">Geofence Active</h5>
                    <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                      Setup your office boundary. Drag the marker or click to move center.
                    </p>
                  </div>
                </div>
             </div>
          </div>

          {/* Map Layer Switcher */}
          <div className="absolute bottom-4 left-4 z-10">
            <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-xl border border-white shadow-xl flex gap-1">
              <button title="Street" className="p-2 bg-blue-600 rounded-lg text-white shadow-md transition-all active:scale-95">
                <MapIcon className="h-4 w-4" />
              </button>
              <button title="Satellite" className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 transition-all hover:text-blue-600">
                <Layers className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Map>

        {/* Coords Toast */}
        {latitude && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-bottomDuration-300">
            <div className="bg-gray-900/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4">
               <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                 <span className="text-[9px] uppercase font-black text-gray-500 tracking-widest">Latitude</span>
                 <span className="text-sm font-bold font-mono text-white tabular-nums tracking-tight">{latitude}</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-[9px] uppercase font-black text-gray-500 tracking-widest">Longitude</span>
                 <span className="text-sm font-bold font-mono text-white tabular-nums tracking-tight">{longitude}</span>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Radius Controls & Manual Coordinates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xl space-y-5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-gray-900 flex items-center gap-2.5">
              <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Move className="h-4 w-4 text-blue-600" />
              </div>
              Fence Radius
            </label>
            <div className="text-xs font-black text-blue-600 px-3 py-1 bg-blue-50 rounded-full border border-blue-100 uppercase tracking-tighter">
              {radius} meters
            </div>
          </div>
          
          <input
            type="range"
            min="50"
            max="1000"
            step="50"
            value={radius}
            onChange={(e) => onRadiusChange?.(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-colors"
          />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Latitude</label>
              <Input
                type="number"
                value={latitude}
                onChange={(e) => onLocationChange(e.target.value, longitude)}
                className="h-9 text-xs font-mono font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Longitude</label>
              <Input
                type="number"
                value={longitude}
                onChange={(e) => onLocationChange(latitude, e.target.value)}
                className="h-9 text-xs font-mono font-bold"
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-2xl shadow-xl flex items-center gap-4 group hover:scale-[1.01] transition-transform">
          <div className="h-12 w-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0 border border-white/20 group-hover:bg-white/30 transition-colors">
            <Crosshair className="h-6 w-6 text-white" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-white tracking-tight">Precision Geofencing</h5>
            <p className="text-xs text-blue-100/80 leading-relaxed font-medium">
              Automated attendance verification within the marked zone. Ensures data integrity and real-time tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

