"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { useFieldLocation } from "@/hooks/useFieldLocation";
import { logAttendance, getTodayAttendance, toggleAttendanceBreak, AttendanceRecord } from "@/services/attendanceService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  MapPin, 
  Coffee, 
  Play, 
  LogOut, 
  ShieldCheck, 
  ShieldAlert, 
  Radio, 
  Smartphone, 
  Home, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from "lucide-react";

export function FieldShiftTracker() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket(user?.id);

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [workMode, setWorkMode] = useState<"office" | "wfh" | "field">("field");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isShiftActive = !!todayRecord?.checkIn?.time && !todayRecord?.checkOut?.time;
  const currentWorkMode = todayRecord?.workMode || workMode;
  const isOnBreak = !!todayRecord?.isOnBreak;

  // Use the privacy-first location tracking hook
  const { isTracking, coords, lastPingTime, gpsError, wakeLockActive } = useFieldLocation({
    socket,
    isShiftActive,
    workMode: currentWorkMode,
    isOnBreak,
    pingIntervalMs: 15000,
  });

  // Fetch initial attendance state
  const loadStatus = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const record = await getTodayAttendance(user.id);
      setTodayRecord(record);
      if (record?.workMode) {
        setWorkMode(record.workMode);
      }
    } catch (err: any) {
      console.error("Error loading attendance record:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [user?.id]);

  // Listen for socket attendance-updated events to keep status in sync
  useEffect(() => {
    if (!socket) return;
    const handleAttendanceUpdate = (data: any) => {
      if (data && data.employeeId === user?.id) {
        setTodayRecord((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            checkIn: data.checkIn || prev.checkIn,
            checkOut: data.checkOut || prev.checkOut,
            isOnBreak: typeof data.isOnBreak === "boolean" ? data.isOnBreak : prev.isOnBreak,
            breaks: data.breaks || prev.breaks,
            workMode: data.workMode || prev.workMode,
          };
        });
      }
    };

    socket.on("attendance-updated", handleAttendanceUpdate);
    return () => {
      socket.off("attendance-updated", handleAttendanceUpdate);
    };
  }, [socket, user?.id]);

  // Handle Start Shift (Punch In)
  const handleStartShift = async () => {
    if (!user?.id) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const dateStr = now.toISOString().split("T")[0];

      // Capture GPS location for all modes (Field, Office, and WFH checkpoint)
      let punchLocation: { lat: number; lng: number } | null = coords ? { lat: coords.lat, lng: coords.lng } : null;
      if (!punchLocation && typeof window !== "undefined" && navigator.geolocation) {
        punchLocation = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000 }
          );
        });
      }

      await logAttendance({
        employeeId: user.id,
        date: dateStr,
        checkIn: timeStr,
        workMode,
        location: punchLocation || undefined,
      });

      await loadStatus();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start shift");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Break Toggle (captures break start and break end locations)
  const handleToggleBreak = async () => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const action = isOnBreak ? "end" : "start";

      // Snapshot location where break started or ended
      let breakLocation: { lat: number; lng: number } | null = coords ? { lat: coords.lat, lng: coords.lng } : null;
      if (!breakLocation && typeof window !== "undefined" && navigator.geolocation) {
        breakLocation = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000 }
          );
        });
      }

      const result = await toggleAttendanceBreak({ 
        action, 
        reason: "Employee Break",
        location: breakLocation || undefined 
      });

      if (socket && socket.connected) {
        socket.emit("field-status-update", {
          status: action === "start" ? "break" : "active",
          location: breakLocation || undefined,
        });
      }

      setTodayRecord((prev) => (prev ? { ...prev, isOnBreak: result.isOnBreak, breaks: result.breaks } : null));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update break status");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle End Shift (Punch Out)
  const handleEndShift = async () => {
    if (!user?.id || !todayRecord) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const dateStr = now.toISOString().split("T")[0];

      await logAttendance({
        employeeId: user.id,
        date: dateStr,
        checkOut: timeStr,
      });

      if (socket && socket.connected) {
        socket.emit("field-status-update", { status: "completed" });
      }

      await loadStatus();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to end shift");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-slate-500">Checking shift status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Top Banner indicating Tracking & Privacy Status */}
      <div
        className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between transition-colors ${
          !isShiftActive
            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            : currentWorkMode === "wfh"
            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            : isOnBreak
            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            : isTracking
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        <div className="flex items-center gap-2">
          {!isShiftActive ? (
            <>
              <Radio className="w-4 h-4 text-slate-400" />
              <span>Shift Inactive — Location Offline</span>
            </>
          ) : currentWorkMode === "wfh" ? (
            <>
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>WFH Mode — Location Not Captured (Privacy Active)</span>
            </>
          ) : isOnBreak ? (
            <>
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>On Break — GPS Disconnected for Privacy</span>
            </>
          ) : isTracking ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>Live Field Tracking Active (Broadcasting to Supervisors)</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-slate-500" />
              <span>Office Mode — Static Shift</span>
            </>
          )}
        </div>

        {isConnected && (
          <span className="text-[10px] bg-white/70 dark:bg-black/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
            WS Connected
          </span>
        )}
      </div>

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Mobile Shift & Field Tracker
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Role-authorized live location streaming with break and WFH privacy
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {gpsError && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* If shift NOT started yet: Show Work Mode Selector and Start button */}
        {!isShiftActive && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Today's Work Type:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setWorkMode("field")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-medium ${
                  workMode === "field"
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <MapPin className="w-5 h-5 text-emerald-500" />
                <span>Field Work</span>
                <span className="text-[10px] text-slate-400">GPS Live</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkMode("office")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-medium ${
                  workMode === "office"
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Building2 className="w-5 h-5 text-indigo-500" />
                <span>In-Office</span>
                <span className="text-[10px] text-slate-400">Standard</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkMode("wfh")}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-medium ${
                  workMode === "wfh"
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Home className="w-5 h-5 text-blue-500" />
                <span>WFH</span>
                <span className="text-[10px] text-slate-400">No GPS</span>
              </button>
            </div>

            <Button
              onClick={handleStartShift}
              disabled={actionLoading}
              className="w-full h-11 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              Start Shift ({workMode === "field" ? "Field Duty" : workMode.toUpperCase()})
            </Button>
          </div>
        )}

        {/* If shift is ACTIVE: Show Live Controls */}
        {isShiftActive && (
          <div className="space-y-4">
            {/* Shift info pill */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl flex items-center justify-between text-xs border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">Clocked In At</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {todayRecord?.checkIn?.time || "Active"}
                </span>
              </div>
              <div className="text-center">
                <span className="text-slate-400 block text-[11px]">Mode</span>
                <span className="font-semibold uppercase text-primary">
                  {currentWorkMode}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Status</span>
                <span
                  className={`font-semibold ${
                    isOnBreak ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {isOnBreak ? "On Break" : "Working"}
                </span>
              </div>
            </div>

            {/* Field telemetry (only visible for field duty) */}
            {currentWorkMode === "field" && (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    GPS Accuracy:
                  </span>
                  <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                    {coords ? `±${coords.accuracy}m` : "Acquiring..."}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-indigo-600" />
                    Last WebSocket Ping:
                  </span>
                  <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                    {lastPingTime ? lastPingTime.toLocaleTimeString() : "Pending"}
                  </span>
                </div>

                {wakeLockActive && (
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1 pt-1 border-t border-emerald-200/40 dark:border-emerald-800/30">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Screen Wake Lock is active (keeps app alive while on duty).
                  </div>
                )}
              </div>
            )}

            {/* Action buttons: Break toggle and End Shift */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleToggleBreak}
                disabled={actionLoading}
                className={`h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isOnBreak
                    ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
                    : "border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                }`}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isOnBreak ? (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    Resume Shift
                  </>
                ) : (
                  <>
                    <Coffee className="w-4 h-4" />
                    Take Break
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleEndShift}
                disabled={actionLoading}
                className="h-11 rounded-xl text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:border-rose-900/40 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    End Shift
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Privacy Note */}
        <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800/60">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Strict Privacy: Location is transmitted <strong>only</strong> during active field shifts. 
            Taking a break, selecting WFH, or ending shift completely pauses tracking.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

