"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom Leaflet icons based on status
const createCustomIcon = (colorHex: string, label: string) => {
  return L.divIcon({
    className: "custom-field-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="background-color: ${colorHex}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white;">
          <span style="color: white; font-size: 13px; font-weight: bold;">${label.charAt(0).toUpperCase()}</span>
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${colorHex}; margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -42],
  });
};

function MapViewRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { duration: 1.2 });
  }, [center, map]);
  return null;
}

export interface FieldWorkerMarker {
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  trackingState: "active" | "break" | "wfh" | "office" | "completed";
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number | null;
  updatedAt?: string | Date;
}

interface LiveFieldTrackingMapProps {
  workers: FieldWorkerMarker[];
  selectedWorkerId?: string | null;
  onSelectWorker?: (id: string) => void;
}

export default function LiveFieldTrackingMap({
  workers,
  selectedWorkerId,
  onSelectWorker,
}: LiveFieldTrackingMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full w-full min-h-[450px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl flex items-center justify-center">
        <span className="text-sm text-slate-400 font-medium">Loading map engine...</span>
      </div>
    );
  }

  // Determine default center: selected worker, or first worker with coords, or default fallback (New Delhi / 28.6139, 77.2090)
  const activeWorkerWithCoords = workers.find((w) => w.employeeId === selectedWorkerId && w.lat && w.lng)
    || workers.find((w) => w.lat && w.lng);

  const defaultCenter: [number, number] = activeWorkerWithCoords
    ? [activeWorkerWithCoords.lat, activeWorkerWithCoords.lng]
    : [28.6139, 77.209];

  return (
    <div className="h-full w-full min-h-[450px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative">
      <MapContainer
        center={defaultCenter}
        zoom={activeWorkerWithCoords ? 15 : 5}
        scrollWheelZoom={true}
        className="h-full w-full z-0 min-h-[500px]"
        style={{ height: "100%", minHeight: "500px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {activeWorkerWithCoords && (
          <MapViewRecenter center={[activeWorkerWithCoords.lat, activeWorkerWithCoords.lng]} />
        )}

        {workers
          .filter((w) => typeof w.lat === "number" && typeof w.lng === "number")
          .map((worker) => {
            const isSelected = worker.employeeId === selectedWorkerId;
            const markerColor =
              worker.trackingState === "active"
                ? "#10b981" // emerald (field live)
                : worker.trackingState === "office"
                ? "#6366f1" // indigo (office live)
                : worker.trackingState === "break"
                ? "#f59e0b" // amber (break location)
                : worker.trackingState === "wfh"
                ? "#3b82f6" // blue (wfh current location)
                : "#64748b"; // slate

            const icon = createCustomIcon(markerColor, worker.name || "U");

            return (
              <Marker
                key={worker.employeeId}
                position={[worker.lat, worker.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectWorker?.(worker.employeeId),
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-3 border-b pb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {worker.name}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          worker.trackingState === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : worker.trackingState === "office"
                            ? "bg-indigo-100 text-indigo-800"
                            : worker.trackingState === "break"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {worker.trackingState === "active"
                          ? "Field (Live)"
                          : worker.trackingState === "office"
                          ? "Office (Live)"
                          : worker.trackingState === "break"
                          ? "On Break (Paused)"
                          : "WFH (Current)"}
                      </span>
                    </div>

                    <div className="text-slate-600 dark:text-slate-300">
                      <div>Dept: {worker.department}</div>
                      <div>Role: {worker.designation}</div>
                      {worker.accuracy && (
                        <div>Accuracy: ±{Math.round(worker.accuracy)}m</div>
                      )}
                      {worker.speed !== null && worker.speed !== undefined && (
                        <div>Speed: {worker.speed} km/h</div>
                      )}
                      {worker.updatedAt && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          Last seen: {new Date(worker.updatedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-xs space-y-1.5 z-[1000]">
        <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mb-1">
          Field Status
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span className="text-slate-600 dark:text-slate-300">Field (Live Tracking)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
          <span className="text-slate-600 dark:text-slate-300">Office (Live Tracking)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          <span className="text-slate-600 dark:text-slate-300">On Break (Break Point)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
          <span className="text-slate-600 dark:text-slate-300">WFH (Current Location)</span>
        </div>
      </div>
    </div>
  );
}

