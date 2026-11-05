import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

interface UseFieldLocationProps {
  socket: Socket | null;
  isShiftActive: boolean;
  workMode: "office" | "wfh" | "field";
  isOnBreak: boolean;
  pingIntervalMs?: number; // default 15000 ms (15s)
}

export interface FieldLocationState {
  isTracking: boolean;
  coords: {
    lat: number;
    lng: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
  } | null;
  lastPingTime: Date | null;
  gpsError: string | null;
  wakeLockActive: boolean;
  isNative: boolean;
}

export function useFieldLocation({
  socket,
  isShiftActive,
  workMode,
  isOnBreak,
  pingIntervalMs = 15000,
}: UseFieldLocationProps): FieldLocationState {
  const [coords, setCoords] = useState<FieldLocationState["coords"]>(null);
  const [lastPingTime, setLastPingTime] = useState<Date | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();
  const webWatchIdRef = useRef<number | null>(null);
  const capWatchIdRef = useRef<string | null>(null);
  const wakeLockSentinelRef = useRef<any>(null);
  const lastEmitTimeRef = useRef<number>(0);

  // Both Field and Office modes have continuous live tracking (except while on break)
  const shouldTrack = isShiftActive && (workMode === "field" || workMode === "office") && !isOnBreak;

  // 1. Wake Lock management: Keeps the phone screen on to prevent mobile OS throttling
  const acquireWakeLock = useCallback(async () => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
    try {
      const sentinel = await (navigator as any).wakeLock.request("screen");
      wakeLockSentinelRef.current = sentinel;
      setWakeLockActive(true);

      sentinel.addEventListener("release", () => {
        setWakeLockActive(false);
      });
    } catch (err: any) {
      console.warn("[FieldLocation] Screen WakeLock unavailable:", err?.message);
      setWakeLockActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch {}
      wakeLockSentinelRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  // Handle visibility change to re-acquire wake lock if tab is refocused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && shouldTrack) {
        acquireWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [shouldTrack, acquireWakeLock]);

  // 2. Geolocation Watch management (Capacitor Native + Web Hybrid)
  useEffect(() => {
    let isSubscribed = true;

    const stopTracking = async () => {
      // Clear web watch
      if (webWatchIdRef.current !== null && typeof window !== "undefined") {
        navigator.geolocation.clearWatch(webWatchIdRef.current);
        webWatchIdRef.current = null;
      }
      // Clear Capacitor native watch
      if (capWatchIdRef.current) {
        try {
          await Geolocation.clearWatch({ id: capWatchIdRef.current });
        } catch {}
        capWatchIdRef.current = null;
      }
      releaseWakeLock();
    };

    if (!shouldTrack) {
      stopTracking();
      return;
    }

    acquireWakeLock();
    setGpsError(null);

    const handleCoords = (latitude: number, longitude: number, accuracy: number, speed: number | null, heading: number | null) => {
      if (!isSubscribed) return;

      const newCoords = {
        lat: latitude,
        lng: longitude,
        accuracy: Math.round(accuracy),
        speed: speed !== null ? Math.round(speed * 3.6) : null,
        heading: heading !== null ? Math.round(heading) : null,
      };

      setCoords(newCoords);

      const now = Date.now();
      if (now - lastEmitTimeRef.current >= pingIntervalMs) {
        lastEmitTimeRef.current = now;
        setLastPingTime(new Date());

        if (socket && socket.connected) {
          socket.emit("field-location-update", {
            ...newCoords,
            workMode,
            timestamp: new Date().toISOString(),
          });
        }
      }
    };

    const startTracking = async () => {
      if (isNative) {
        try {
          const perm = await Geolocation.requestPermissions();
          if (perm.location !== "granted") {
            setGpsError("Native GPS permission not granted. Please allow location access.");
            return;
          }

          const watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
            (position, err) => {
              if (err) {
                setGpsError(err.message || "Native GPS error");
                return;
              }
              if (position?.coords) {
                handleCoords(
                  position.coords.latitude,
                  position.coords.longitude,
                  position.coords.accuracy,
                  position.coords.speed,
                  position.coords.heading
                );
              }
            }
          );
          capWatchIdRef.current = watchId;
        } catch (err: any) {
          setGpsError(err?.message || "Failed to start native geolocation");
        }
      } else {
        // Standard Web Geolocation fallback
        if (typeof window === "undefined" || !navigator.geolocation) {
          setGpsError("Geolocation is not supported by your browser");
          return;
        }

        webWatchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            handleCoords(
              pos.coords.latitude,
              pos.coords.longitude,
              pos.coords.accuracy,
              pos.coords.speed,
              pos.coords.heading
            );
          },
          (err) => {
            setGpsError(err.message || "Web GPS error");
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 25000 }
        );
      }
    };

    startTracking();

    return () => {
      isSubscribed = false;
      stopTracking();
    };
  }, [shouldTrack, pingIntervalMs, socket, acquireWakeLock, releaseWakeLock, isNative, workMode]);

  return {
    isTracking: shouldTrack && !gpsError,
    coords,
    lastPingTime,
    gpsError,
    wakeLockActive,
    isNative,
  };
}


