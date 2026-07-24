"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, AlertCircle, Settings } from 'lucide-react';
import { Button } from './Button';

// Import Leaflet CSS dynamically
const LeafletCSS = () => {
  useEffect(() => {
    import('leaflet/dist/leaflet.css');
  }, []);
  return null;
};

interface MapPickerProps {
  latitude: string;
  longitude: string;
  onLocationChange: (lat: string, lng: string) => void;
  radius?: number;
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unknown';

// Inner map component that uses react-leaflet (will be dynamically imported)
const MapInner = ({ 
  position, 
  onLocationSelect, 
  handleLocationSelect 
}: { 
  position: [number, number]; 
  onLocationSelect: (lat: number, lng: number) => void;
  handleLocationSelect: (lat: number, lng: number) => void;
}) => {
  const { MapContainer, TileLayer, Marker, useMap, useMapEvents } = require('react-leaflet');
  const L = require('leaflet');

  const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      if (map) {
        map.setView(center, map.getZoom());
      }
    }, [center, map]);
    return null;
  }

  function MapClickHandler() {
    useMapEvents({
      click: (e: { latlng: { lat: number; lng: number } }) => {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  return (
    <MapContainer
      center={position}
      zoom={15}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker 
        position={position} 
        icon={markerIcon}
        draggable={true}
        eventHandlers={{
          dragend: (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
            const marker = e.target;
            const pos = marker.getLatLng();
            handleLocationSelect(pos.lat, pos.lng);
          },
        }}
      />
      <MapUpdater center={position} />
      <MapClickHandler />
    </MapContainer>
  );
};

export function MapPicker({ latitude, longitude, onLocationChange, radius = 100 }: MapPickerProps) {
  const [isClient, setIsClient] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const lat = parseFloat(latitude) || 20.5937; // Default: India center
  const lng = parseFloat(longitude) || 78.9629;
  const position: [number, number] = [lat, lng];

  // Initialize on client-side only
  useEffect(() => {
    setIsClient(true);
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setPermissionState(result.state as PermissionState);
        
        result.addEventListener('change', () => {
          setPermissionState(result.state as PermissionState);
        });
      } catch (err) {
        setPermissionState('unknown');
      }
    }
  };

  const handleLocationSelect = useCallback((newLat: number, newLng: number) => {
    onLocationChange(newLat.toFixed(6), newLng.toFixed(6));
    setLocationError(null);
  }, [onLocationChange]);

  const getCurrentLocation = async () => {
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    if (permissionState === 'denied') {
      setLocationError('Location permission is blocked. Please enable it in your browser settings and try again.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationChange(latitude.toFixed(6), longitude.toFixed(6));
        setPermissionState('granted');
      },
      (err) => {
        let errorMessage = 'Unable to get your location.';
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please allow location access in your browser settings and try again.';
            setPermissionState('denied');
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please try again or manually select your location on the map.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or manually select your location on the map.';
            break;
          default:
            errorMessage = 'An error occurred while getting your location. Please try again or manually select on the map.';
        }
        
        setLocationError(errorMessage);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
  };

  const openBrowserSettings = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = '';
    
    if (userAgent.includes('chrome')) {
      instructions = 'Chrome: Click the lock icon in the address bar → Site settings → Location → Allow';
    } else if (userAgent.includes('firefox')) {
      instructions = 'Firefox: Click the lock icon in the address bar → Permissions → Location → Allow';
    } else if (userAgent.includes('safari')) {
      instructions = 'Safari: Preferences → Websites → Location → Allow for this website';
    } else if (userAgent.includes('edge')) {
      instructions = 'Edge: Click the lock icon in the address bar → Site permissions → Location → Allow';
    } else {
      instructions = 'Please check your browser settings to allow location access for this site.';
    }
    
    alert(`${instructions}\n\nAfter allowing location access, click "Use My Location" again.`);
  };

  if (!isClient) {
    return (
      <div className="space-y-3">
        <LeafletCSS />
        <div className="h-[400px] w-full rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
          <div className="text-gray-400">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <LeafletCSS />
      {/* Error Alert */}
      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{locationError}</p>
              {permissionState === 'denied' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openBrowserSettings}
                  className="mt-2 flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  How to Enable Location
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          className="flex items-center gap-2"
        >
          <Navigation className="h-4 w-4" />
          Use My Location
        </Button>
        <div className="flex-1 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
          <MapPin className="h-4 w-4 text-blue-600" />
          <span>Click anywhere on map to set location</span>
        </div>
      </div>

      <div className="h-[400px] w-full rounded-lg border border-gray-200 overflow-hidden">
        <MapInner 
          position={position}
          onLocationSelect={handleLocationSelect}
          handleLocationSelect={handleLocationSelect}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
          <span className="text-blue-700 font-medium">Latitude: </span>
          <span className="text-blue-900">{latitude || 'Not set'}</span>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
          <span className="text-blue-700 font-medium">Longitude: </span>
          <span className="text-blue-900">{longitude || 'Not set'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div 
          className="h-3 w-3 rounded-full border-2 border-blue-600 bg-blue-100" 
          style={{ 
            borderStyle: 'dashed',
          }}
        />
        <span>Geo-fence radius: <strong>{radius} meters</strong></span>
      </div>
    </div>
  );
}
