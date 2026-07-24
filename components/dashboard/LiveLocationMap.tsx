"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default icon issues in Next.js
const icon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/5900/5900010.png', // Custom mobile marker
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Component to dynamically update the map center
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

interface LiveLocationMapProps {
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: number;
  };
  deviceName?: string;
}

export default function LiveLocationMap({ location, deviceName }: LiveLocationMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="h-48 w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />;

  const center: [number, number] = [location.latitude, location.longitude];

  return (
    <div className="h-48 w-full rounded-xl overflow-hidden border border-indigo-100 dark:border-indigo-900/30 shadow-inner relative group">
      <MapContainer 
        center={center} 
        zoom={15} 
        scrollWheelZoom={false}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={center} />
        <Marker position={center} icon={icon}>
          <Popup>
            <div className="text-xs font-bold">
              {deviceName || 'Device'} Location
              <br />
              <span className="font-normal text-gray-500">
                Accurate within {Math.round(location.accuracy || 0)}m
              </span>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Decorative Overlay */}
      <div className="absolute top-2 right-2 bg-green-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full z-10 animate-pulse shadow-sm">
        LIVE TRACKING
      </div>
    </div>
  );
}
