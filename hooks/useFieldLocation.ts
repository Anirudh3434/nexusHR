import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

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

  const watchIdRef = useRef<number | null>(null);
  const wakeLockSentinelRef = useRef<any>(null);
  const lastEmitTimeRef = useRef<number>(0);

  // Privacy condition: Tracking only runs when shift is active, workMode is field, and NOT on break
  const shouldTrack = isShiftActive && workMode === "field" && !isOnBreak;

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

  // 2. Geolocation Watch management with strict Privacy enforcement
  useEffect(() => {
    if (!shouldTrack) {
      // Clear any active watch immediately
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      releaseWakeLock();
      return;
    }

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      return;
    }

    // Acquire wake lock for active field shift
    acquireWakeLock();
    setGpsError(null);

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy, speed, heading } = position.coords;

      const newCoords = {
        lat: latitude,
        lng: longitude,
        accuracy: Math.round(accuracy),
        speed: speed !== null ? Math.round(speed * 3.6) : null, // Convert m/s to km/h
        heading: heading !== null ? Math.round(heading) : null,
      };

      setCoords(newCoords);

      // Throttle WebSocket emits to preserve mobile battery & data
      const now = Date.now();
      if (now - lastEmitTimeRef.current >= pingIntervalMs) {
        lastEmitTimeRef.current = now;
        setLastPingTime(new Date());

        if (socket && socket.connected) {
          socket.emit("field-location-update", {
            ...newCoords,
            timestamp: new Date().toISOString(),
          });
        }
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMsg = "Unable to retrieve location";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = "Location permission denied. Please allow GPS access in browser settings.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg = "Location information is unavailable.";
          break;
        case error.TIMEOUT:
          errorMsg = "Location request timed out.";
          break;
      }
      setGpsError(errorMsg);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 25000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      releaseWakeLock();
    };
  }, [shouldTrack, pingIntervalMs, socket, acquireWakeLock, releaseWakeLock]);

  return {
    isTracking: shouldTrack && !gpsError,
    coords,
    lastPingTime,
    gpsError,
    wakeLockActive,
  };
}

