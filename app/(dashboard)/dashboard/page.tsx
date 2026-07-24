"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { logAttendance } from "../../../services/attendanceService";
import { getNotices, Notice } from "../../../services/noticeService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { 
  Clock, Play, Square, Users, Calendar, TrendingUp, 
  CheckCircle, AlertCircle, Briefcase, UserCheck, 
  ArrowRight, Loader2, MapPin, Cake, Home, Gift, 
  UserPlus, ClockAlert, Palmtree, PartyPopper,
  MapPinOff, XCircle, X, Info, Smartphone, QrCode, ShieldCheck,
  Battery, BatteryCharging, Wifi, Signal, WifiOff, Link2Off
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSocket } from "../../../hooks/useSocket";

const LiveLocationMap = dynamic(() => import("../../../components/dashboard/LiveLocationMap"), { 
  ssr: false,
  loading: () => <div className="h-48 w-full bg-gray-100 animate-pulse rounded-xl" />
});
 
 // Helper to format 24h time to 12h time
 const formatShiftTime = (time?: string) => {
   if (!time) return '';
   const [hours, minutes] = time.split(':').map(Number);
   const ampm = hours >= 12 ? 'PM' : 'AM';
   const h = hours % 12 || 12;
   return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
 };

export default function DashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeShift, setActiveShift] = useState<{ start: Date; mode: string } | null>(null);
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office');
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    title: string;
    message: string;
    type: 'location' | 'radius' | 'config' | 'general';
  } | null>(null);

  // Check location permission on mount and when workMode changes
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then(result => {
          setLocationPermission(result.state as any);
          result.onchange = () => {
            setLocationPermission(result.state as any);
          };
        })
        .catch(() => setLocationPermission('unknown'));
    }
  }, []);

  const requestLocationPermission = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationPermission('granted');
          addToast({ type: 'success', title: 'Location Enabled', description: 'Permissions granted successfully.' });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) setLocationPermission('denied');
          console.error("Location request failed:", error);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [liveLocation, setLiveLocation] = useState<any>(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const { socket, isConnected, isReconnecting, emitEvent, onEvent, onReconnect } = useSocket(user?.id);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track data source to prevent API from overwriting socket state
  const dataSourceRef = useRef<'socket' | 'api'>('api');
  
  // Separate state for socket-driven data (not overwritten by API)
  const [socketDeviceStats, setSocketDeviceStats] = useState<any>(null);
  const [socketAttendance, setSocketAttendance] = useState<any>(null);
  
  // Track if shift was recently cleared via socket to prevent API from recreating it
  const shiftClearedViaSocket = useRef(false);

  // Load active shift from localStorage if it exists and fetch stats
  useEffect(() => {
    const savedShift = localStorage.getItem("active-shift");
    if (savedShift) {
      const shiftData = JSON.parse(savedShift);
      setActiveShift({ 
        start: new Date(shiftData.start), 
        mode: shiftData.mode || 'office' 
      });
      setWorkMode(shiftData.mode || 'office');
    }
    
    // Initial data fetch (always run on mount)
    fetchDashboardData();
    fetchNotices();

    // Initial QR Token fetch
    if (user) {
      fetchQrToken();
    }
    
    return () => {
      // Cleanup intervals
      if (timerRef.current) clearInterval(timerRef.current);
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [user]);

  // Conditional API polling: only poll when socket is disconnected
  useEffect(() => {
    // Only poll if socket is not connected
    if (!isConnected && user) {
      console.log('[Dashboard] Socket disconnected, starting API polling');
      fetchDashboardData();
      statsIntervalRef.current = setInterval(fetchDashboardData, 10000);
      
      return () => {
        if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      };
    } else if (isConnected && statsIntervalRef.current) {
      // Stop polling when socket reconnects
      console.log('[Dashboard] Socket reconnected, stopping API polling');
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, [isConnected, user]);

  // QR token refresh interval (always runs, independent of socket)
  useEffect(() => {
    if (!user) return;
    
    qrTimerRef.current = setInterval(fetchQrToken, 60000); // Refresh every 60s
    
    return () => {
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    };
  }, [user]);

  // Rejoin QR room on socket reconnect
  useEffect(() => {
    if (!socket || !qrToken) return;

    const cleanup = onReconnect(() => {
      console.log('[Socket] Reconnected, rejoining QR room');
      socket.emit("join-qr-room", qrToken);
    });

    return cleanup;
  }, [socket, qrToken, onReconnect]);

  // Real-time Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    console.log("[Socket] Dashboard initializing listeners for user:", user?.id);

    // Device linked - fetch initial data once
    onEvent("device-linked-success", (deviceInfo) => {
      console.log("Device linked in real-time:", deviceInfo);
      addToast({ type: 'success', title: 'Smartphone linked successfully!', description: '' });
      setIsProcessingScan(false);
      fetchDashboardData(); // Only fetch this once for initial data
    });

    // QR scan detected
    onEvent("qr-processing", () => {
      console.log("QR Scan detected, processing...");
      setIsProcessingScan(true);
    });

    // Location synced - update directly, don't fetch from API
    onEvent("location-synced", (location) => {
      console.log("Real-time location received:", location);
      dataSourceRef.current = 'socket';
      setLiveLocation(location);
    });

    // Device stats synced - update directly, don't fetch from API
    onEvent("device-synced", (stats: any) => {
      console.log("[Socket] Real-time device sync received:", stats);
      dataSourceRef.current = 'socket';
      setSocketDeviceStats(stats);
      
      // Merge socket stats into dashboard data
      setDashboardData((prev: any) => {
        if (!prev || !prev.employee || !prev.employee.linkedDevice) return prev;
        return {
          ...prev,
          employee: {
            ...prev.employee,
            linkedDevice: {
              ...prev.employee.linkedDevice,
              ...stats
            }
          }
        };
      });
    });

    // Attendance updated - handle directly, don't fetch from API
    onEvent("attendance-updated", (data: any) => {
      console.log("[Socket] Real-time attendance update received:", data);
      dataSourceRef.current = 'socket';
      setSocketAttendance(data);
      
      // Handle check-in: if socket data has checkIn and no checkOut, start the shift
      if (data.checkIn && !data.checkOut) {
        console.log('[Socket] User checked in via socket, starting shift and timer');
        const checkInTime = typeof data.checkIn === 'string' ? data.checkIn : data.checkIn.time;
        if (checkInTime) {
          const [hours, minutes] = checkInTime.split(':').map(Number);
          const today = new Date();
          const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0, 0);
          const mode = data.workMode || data.checkIn.workMode || 'office';
          
          setActiveShift({ start, mode });
          localStorage.setItem("active-shift", JSON.stringify({ start: start.toISOString(), mode }));
          console.log('[Socket] Shift started from socket:', start.toLocaleTimeString(), 'mode:', mode);
        }
      }
      
      // Immediately handle check-out: if socket data has checkOut, clear the shift
      if (data.checkOut) {
        console.log('[Socket] User checked out via socket, clearing shift and resetting timer');
        // Clear the interval directly
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        shiftClearedViaSocket.current = true;
        setActiveShift(null);
        setElapsedTime("00:00:00");
        localStorage.removeItem("active-shift");
        
        // Reset the flag after a short delay to allow reconciliation to work normally again
        setTimeout(() => {
          shiftClearedViaSocket.current = false;
        }, 2000);
      }
      
      // Do NOT call fetchDashboardData() here - trust socket data
      // Only fetch if we need additional data not in the socket event
    });
  }, [socket]);

  const fetchQrToken = async () => {
    try {
      const storedUser = localStorage.getItem("user");
      const userData = storedUser ? JSON.parse(storedUser) : null;
      const headers: Record<string, string> = userData ? {
        'x-user-id': userData.id || '',
        'x-company-id': userData.companyId || ''
      } : {};

      const res = await fetch('/api/qr/generate', { method: 'POST', headers });
      if (res.ok) {
        const data = await res.json();
        setQrToken(data.token);
        setIsProcessingScan(false); // Reset on new token
        
        // Join the unique room for this QR token
        if (socket) {
          socket.emit("join-qr-room", data.token);
        }
      }
    } catch (err) {
      console.error("Failed to fetch QR token:", err);
    }
  };

  const fetchNotices = async () => {
    try {
      setNoticesLoading(true);
      if (user?.companyId) {
        const data = await getNotices({ companyId: user.companyId, limit: 5 });
        setNotices(data);
      }
    } catch (error) {
      console.error("Failed to fetch notices:", error);
    } finally {
      setNoticesLoading(false);
    }
  };

  const handleUnlinkDevice = async () => {
    if (!user) return;
    setUnlinking(true);
    try {
      const response = await fetch('/api/device/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyUserId: user.id })
      });
      
      const data = await response.json();
      if (response.ok) {
        addToast({ type: 'success', title: 'Device disconnected successfully', description: '' });
        fetchDashboardData(); // Refresh to show QR
      } else {
        addToast({ type: 'error', title: data.message || 'Failed to unlink device', description: '' });
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Network error unlinking device', description: '' });
    } finally {
      setUnlinking(false);
    }
  };
  
  const fetchDashboardData = async () => {
    try {
      setDataLoading(true);
      
      // Get user from localStorage for API headers
      const storedUser = localStorage.getItem("user");
      const userData = storedUser ? JSON.parse(storedUser) : null;
      
      const headers: Record<string, string> = {};
      if (userData) {
        headers['x-user-id'] = userData.id || '';
        headers['x-user-role'] = userData.role || 'employee';
        headers['x-user-name'] = userData.name || '';
        headers['x-company-id'] = userData.companyId || '';
      }
      
      const response = await fetch('/api/dashboard/stats', { headers });
      if (response.ok) {
        const data = await response.json();
        
        // Only update dashboard data if we're not in socket mode (socket is primary source of truth)
        // If data source is socket, only update non-real-time fields (not device stats, location, attendance)
        if (dataSourceRef.current === 'socket') {
          setDashboardData((prev: any) => {
            if (!prev) return data;
            // Preserve socket-driven data, update other fields
            return {
              ...data,
              employee: {
                ...data.employee,
                // Preserve socket device stats
                linkedDevice: socketDeviceStats ? {
                  ...prev.employee?.linkedDevice,
                  ...socketDeviceStats
                } : data.employee?.linkedDevice
              }
            };
          });
        } else {
          // API is primary source, update all data
          setDashboardData(data);
          
          // Reconcile Shift State: If server says user is present but web doesn't have an active shift
          const hasCheckedOut = !!data.overview?.checkOutTime;
          const hasCheckIn = !!data.overview?.checkInTime;
          const isPresentStatus = hasCheckIn && !hasCheckedOut;
          
          console.log('[Dashboard] API Reconciliation check:', {
            todayStatus: data.overview?.todayStatus,
            checkInTime: data.overview?.checkInTime,
            checkOutTime: data.overview?.checkOutTime,
            hasCheckedOut,
            isPresentStatus,
            currentActiveShift: !!activeShift,
            dataSource: dataSourceRef.current
          });
          
          // Only reconcile if socket didn't recently clear the shift
          if (isPresentStatus && !activeShift && !shiftClearedViaSocket.current) {
            const checkInTime = data.overview.checkInTime;
            if (checkInTime) {
              const [hours, minutes] = (typeof checkInTime === 'string' ? checkInTime : checkInTime.time).split(':').map(Number);
              const today = new Date();
              const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0, 0);
              
              setActiveShift({ start, mode: 'office' });
              localStorage.setItem("active-shift", JSON.stringify({ start: start.toISOString(), mode: 'office' }));
              console.log('[Dashboard] Shift reconciled from API:', start.toLocaleTimeString());
            }
          } else if (!isPresentStatus && activeShift && !shiftClearedViaSocket.current) {
            // Only clear if API says not present and socket didn't clear it
            console.log('[Dashboard] Clearing shift via API reconciliation');
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            setActiveShift(null);
            setElapsedTime("00:00:00");
            localStorage.removeItem("active-shift");
          }
        }
      } else {
        console.error("Dashboard API error:", response.status, await response.text());
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Update timer every second if shift is active
  useEffect(() => {
    console.log('[Timer] useEffect triggered, activeShift:', !!activeShift);
    
    if (activeShift) {
      console.log('[Timer] Starting timer interval');
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - activeShift.start.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        );
      }, 1000);
    } else {
      console.log('[Timer] Clearing timer interval and resetting elapsed time');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedTime("00:00:00");
    }
    
    return () => {
      console.log('[Timer] Cleanup function called');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeShift]);

  if (!user) return null;

  const handleCheckIn = async () => {
    try {
      const response = await logAttendance({
        employeeId: user.id || '',
        companyId: user.companyId || '',
        date: new Date().toISOString().split('T')[0],
        checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        workMode,
      });

      addToast({
        type: response.isLate ? 'info' : 'success',
        title: response.isLate ? 'Checked In (Late)' : 'Checked In Successfully',
        description: response.isLate 
          ? `You're ${response.lateMinutes} mins late. Effort starts now!` 
          : 'Great job starting your shift on time!',
      });
      
      const newShift = {
        start: new Date(),
        mode: workMode
      };
      setActiveShift(newShift);
      localStorage.setItem("active-shift", JSON.stringify(newShift));
      fetchDashboardData();
    } catch (error: any) {
      console.error("Check-in error:", error);
      
      let errorType: 'location' | 'radius' | 'config' | 'general' = 'general';
      if (error.message?.includes('location') || error.message?.includes('permis')) errorType = 'location';
      else if (error.message?.includes('radius') || error.message?.includes('away')) errorType = 'radius';
      else if (error.message?.includes('config')) errorType = 'config';

      setErrorModal({
        title: errorType === 'location' ? 'Location Access Required' : 
               errorType === 'radius' ? 'Outside Office Range' : 
               errorType === 'config' ? 'Configuration Missing' : 'Check-in Failed',
        message: error.message || 'We could not log your attendance at this time.',
        type: errorType
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeShift) return;
    const now = new Date();
    const diff = now.getTime() - activeShift.start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    // Update attendance in API
    if (user) {
      try {
        const today = now.toISOString().split('T')[0];
        const checkOutTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await logAttendance({
          employeeId: user.id,
          date: today,
          checkOut: checkOutTime,
          companyId: user.companyId,
        });
      } catch (error) {
        console.error("Failed to log check-out:", error);
      }
    }
    
    setActiveShift(null);
    localStorage.removeItem("active-shift");
    addToast({ type: "info", title: "Shift Ended", description: `Total time worked: ${hours}h ${minutes}m. Log saved to Attendance.` });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Welcome back, {user.name.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Here is an overview of what's happening today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Shift Tracker - Available for All Roles (Admin, HR, Manager, Employee) */}
        <Card className="hover:shadow-md transition-shadow border-blue-500/20 dark:border-blue-500/10 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-blue-50/30 dark:bg-blue-900/10">
            <div>
              <CardTitle className="text-sm font-medium">Shift Tracker</CardTitle>
              <p className="text-xs text-blue-600 mt-0.5 capitalize">{user.role} View</p>
            </div>
            <Clock size={16} className={activeShift ? "text-blue-600 animate-pulse" : "text-gray-400"} />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col items-center gap-4">
              <div className="text-4xl font-black font-mono tracking-tighter tabular-nums">
                {elapsedTime}
              </div>
              
              {!activeShift ? (
                <div className="w-full space-y-4">
                  <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <button
                      onClick={() => {
                        setWorkMode('office');
                        if (locationPermission === 'prompt') requestLocationPermission();
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
                        workMode === 'office' 
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Briefcase size={14} />
                      Office
                    </button>
                    <button
                      onClick={() => setWorkMode('wfh')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
                        workMode === 'wfh' 
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Home size={14} />
                      WFH
                    </button>
                  </div>

                  {/* Location Warning for Office Mode */}
                  {workMode === 'office' && locationPermission === 'denied' && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                      <AlertCircle size={14} className="text-red-600 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-red-800 dark:text-red-400 leading-tight">
                          Location access is blocked. Allow it in browser settings or switch to WFH mode.
                        </p>
                      </div>
                    </div>
                  )}

                  {workMode === 'office' && locationPermission === 'prompt' && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-[10px] font-medium text-blue-800 dark:text-blue-400 leading-tight">
                          Office check-in requires location access. Please allow the browser request.
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="w-full h-7 text-[10px] bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-md"
                        onClick={requestLocationPermission}
                      >
                        Allow Access Now
                      </Button>
                    </div>
                  )}

                  <Button 
                    onClick={handleCheckIn} 
                    className="w-full h-11 font-bold gap-2"
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                    Check In
                  </Button>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <div className="flex items-center justify-center gap-2 py-1 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                    {activeShift.mode === 'office' ? <Briefcase size={12} /> : <Home size={12} />}
                    Working from {activeShift.mode === 'office' ? 'Office' : 'Home'}
                  </div>
                  <Button onClick={handleCheckOut} variant="destructive" className="w-full h-11 font-bold gap-2">
                    <Square size={16} fill="currentColor" />
                    Check Out
                  </Button>
                </div>
              )}
              
              <p className="text-xs text-center text-gray-500">
                {activeShift 
                  ? `Shift started at ${activeShift.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                  : "Ready to start your shift?"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mobile App Login QR / Linked Device Detail */}
        <Card className="hover:shadow-lg transition-all duration-300 border-indigo-500/20 dark:border-indigo-500/10 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/10 dark:to-gray-900 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Mobile Access
                {dashboardData?.employee?.linkedDevice ? (
                  <span className="px-1.5 py-0.5 text-[8px] font-bold bg-green-600 text-white rounded-full uppercase tracking-widest">Linked</span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[8px] font-bold bg-indigo-600 text-white rounded-full animate-pulse uppercase tracking-widest">Future</span>
                )}
              </CardTitle>
              <CardDescription className="text-[10px]">
                {dashboardData?.employee?.linkedDevice ? "Connected Smartphone" : "Seamless mobile login"}
              </CardDescription>
            </div>
            <Smartphone size={16} className="text-indigo-600 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center gap-4">
            {dashboardData?.employee?.linkedDevice ? (
              // Linked Device View (Dashboard Mode)
              <div className="w-full space-y-4 animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center py-4 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                  <div className="relative mb-3">
                    <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                      <Smartphone size={32} className="text-indigo-600" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white dark:border-gray-900 w-4 h-4 rounded-full" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{dashboardData.employee.linkedDevice.deviceName}</h4>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    {dashboardData.employee.linkedDevice.platform} • {dashboardData.employee.linkedDevice.model || 'Unknown Model'}
                  </p>
                </div>
                
                {/* Real-time Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col items-center gap-1.5 p-2 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30">
                    <div className="flex items-center gap-1.5">
                      {dashboardData.employee.linkedDevice.batteryState === 'charging' ? (
                        <BatteryCharging size={14} className="text-amber-500 animate-pulse" />
                      ) : (
                        <Battery size={14} className={dashboardData.employee.linkedDevice.batteryLevel < 0.2 ? "text-red-500" : "text-green-600"} />
                      )}
                      <span className="text-xs font-black text-gray-900 dark:text-white">
                        {Math.round((dashboardData.employee.linkedDevice.batteryLevel || 0) * 100)}%
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Battery Life</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 p-2 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30">
                    <div className="flex items-center gap-1.5">
                      {dashboardData.employee.linkedDevice.networkType === 'wifi' ? (
                        <Wifi size={14} className="text-blue-600" />
                      ) : dashboardData.employee.linkedDevice.networkType === 'none' ? (
                        <WifiOff size={14} className="text-red-500" />
                      ) : (
                        <Signal size={14} className="text-indigo-600" />
                      )}
                      <span className="text-xs font-black text-gray-900 dark:text-white capitalize">
                        {dashboardData.employee.linkedDevice.networkType || 'Offline'}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Connection</span>
                  </div>
                </div>

                <div className="text-[9px] text-center text-gray-400 italic">
                  Last sync: {new Date(dashboardData.employee.linkedDevice.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Real-time Map Widget */}
                {liveLocation ? (
                  <LiveLocationMap 
                    location={liveLocation} 
                    deviceName={dashboardData.employee.linkedDevice.model} 
                  />
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-2">
                    <MapPin className="text-gray-300 animate-bounce" size={24} />
                    <p className="text-[10px] text-gray-400 font-medium">Waiting for GPS signal...</p>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleUnlinkDevice}
                  disabled={unlinking}
                  className="w-full text-red-500 border-red-100 hover:bg-red-50 hover:text-red-600 h-8 text-[10px] uppercase font-bold tracking-wider"
                >
                  {unlinking ? <Loader2 size={12} className="animate-spin" /> : <Link2Off size={12} className="mr-1.5" />}
                  Disconnect Device
                </Button>
              </div>
            ) : (
              // QR Code View (Initial Pairing)
              <>
                <div className="relative p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-inner border border-indigo-100 dark:border-indigo-900/30 group/qr">
                  <div className="w-32 h-32 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden relative">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(`HRM-AUTH-OTT|${qrToken || 'loading'}`)}&bgcolor=ffffff&color=4f46e5`}
                      alt="Login QR Code"
                      className="w-full h-full object-contain pointer-events-none select-none mix-blend-multiply dark:mix-blend-normal rounded-sm"
                    />
                    {isProcessingScan ? (
                      <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
                        <Loader2 size={32} className="text-indigo-600 animate-spin" />
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center px-4 leading-tight">
                          Verifying Scan...
                        </p>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                        <QrCode size={24} className="text-indigo-600 animate-bounce" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-indigo-500 rounded-tl-md" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-indigo-500 rounded-tr-md" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-indigo-500 rounded-bl-md" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-indigo-500 rounded-br-md" />
                </div>
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100/50 dark:border-indigo-800/30">
                    <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <p className="text-[10px] font-medium text-indigo-900 dark:text-indigo-300 leading-tight">
                      Scan this code with the <span className="font-bold underline decoration-indigo-500/30">HRM Mobile App</span> for an instant, secure session.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <div className="h-1 w-1 rounded-full bg-indigo-400 animate-ping" />
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Coming Soon</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* HR and Admin see this */}
        {(user.role === "admin" || user.role === "hr") && (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dataLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : dashboardData?.overview?.totalEmployees ?? '-'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Total employees in system</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
                <Calendar className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {dataLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : dashboardData?.overview?.pendingLeaves ?? '-'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Pending approval</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
                <CheckCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dataLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `${dashboardData?.overview?.attendanceRate ?? 0}%`}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData?.overview?.todayPresent ?? 0} employees present
                </p>
              </CardContent>
            </Card>
          </>
        )}

      </div>

      {/* Admin/HR Dashboard Widgets - Structured Grid Layout */}
      {(user.role === "admin" || user.role === "hr") && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Today's Highlights</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            
            {/* Late Comers - Small Compact */}
            <Card className="border-0 shadow-md hover:shadow-xl transition-all bg-gradient-to-br from-red-50/50 to-white min-h-[200px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ClockAlert className="h-4 w-4 text-red-500" />
                  Late Coming ({dashboardData?.widgets?.lateComers?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {dataLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : dashboardData?.widgets?.lateComers?.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {dashboardData.widgets.lateComers.map((emp: any) => (
                      <div key={emp.id} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-medium text-red-600">
                          {emp.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.department}</p>
                        </div>
                        <span className="text-xs font-medium text-red-600">
                          {typeof emp.checkIn === 'object' ? emp.checkIn.time : emp.checkIn}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No late comers today</p>
                )}
              </CardContent>
            </Card>

            {/* Birthdays - Featured with gradient */}
            <Card className="border-0 shadow-md hover:shadow-xl transition-all bg-gradient-to-br from-pink-50/80 to-white min-h-[200px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Cake className="h-4 w-4 text-pink-500" />
                  Birthdays ({dashboardData?.widgets?.birthdays?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {dataLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : dashboardData?.widgets?.birthdays?.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {dashboardData.widgets.birthdays.map((emp: any) => (
                      <div key={emp.id} className="flex items-center gap-2 p-2 bg-pink-50 rounded">
                        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-xs font-medium text-pink-600">
                          🎂
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No birthdays today</p>
                )}
              </CardContent>
            </Card>

            {/* On Leave - Tall with subtle gradient */}
            <Card className="border-0 shadow-md hover:shadow-xl transition-all bg-gradient-to-br from-orange-50/70 to-white min-h-[200px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Palmtree className="h-4 w-4 text-orange-500" />
                  On Leave ({dashboardData?.widgets?.onLeave?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {dataLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : dashboardData?.widgets?.onLeave?.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {dashboardData.widgets.onLeave.map((emp: any) => (
                      <div key={emp.id} className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-medium text-orange-600">
                          {emp.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.leaveType}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No one on leave today</p>
                )}
              </CardContent>
            </Card>

            {/* Work From Home - Compact */}
            <Card className="border-0 shadow-md hover:shadow-xl transition-all bg-gradient-to-br from-blue-50/50 to-white min-h-[200px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Home className="h-4 w-4 text-blue-500" />
                  Work From Home ({dashboardData?.widgets?.workFromHome?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {dataLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : dashboardData?.widgets?.workFromHome?.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {dashboardData.widgets.workFromHome.map((emp: any) => (
                      <div key={emp.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                          {emp.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No one working from home</p>
                )}
              </CardContent>
            </Card>

            {/* Today's Joining - Small */}
            <Card className="border-0 shadow-md hover:shadow-xl transition-all bg-gradient-to-br from-green-50/70 to-white min-h-[200px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-green-500" />
                  New Joinings ({dashboardData?.widgets?.joiningToday?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {dataLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : dashboardData?.widgets?.joiningToday?.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {dashboardData.widgets.joiningToday.map((emp: any) => (
                      <div key={emp.id} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-medium text-green-600">
                          👋
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.designation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No new joinings today</p>
                )}
              </CardContent>
            </Card>

            {/* Anniversaries - Wide with gradient */}
            <Card className="border-0 shadow-md hover:shadow-xl transition-all bg-gradient-to-br from-purple-50/70 to-white min-h-[200px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gift className="h-4 w-4 text-purple-500" />
                  Anniversaries ({dashboardData?.widgets?.anniversaries?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {dataLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : dashboardData?.widgets?.anniversaries?.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {dashboardData.widgets.anniversaries.map((emp: any) => (
                      <div key={emp.id} className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-600">
                          🎉
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{emp.name}</p>
                          <p className="text-xs text-purple-600 font-medium">{emp.years} Year{emp.years > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No work anniversaries today</p>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {/* Employee specific Quick Stats */}
      {user.role === "employee" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dataLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `${dashboardData?.overview?.hoursThisWeek ?? 0}h`}
              </div>
              <p className="text-xs text-gray-500 mt-1">Target: {dashboardData?.overview?.targetHours ?? 40}h</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dataLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `${dashboardData?.leaveBalance?.remaining ?? 0} days`}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used: {dashboardData?.leaveBalance?.used ?? 0} / {dashboardData?.leaveBalance?.total ?? 24}
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
              <Briefcase className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-bold ${dashboardData?.overview?.todayStatus === 'Present' ? 'text-green-600' : 'text-gray-600'}`}>
                {dataLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (dashboardData?.overview?.todayStatus || 'Not Checked In')}
              </div>
              {dashboardData?.overview?.checkInTime && (
                <p className="text-xs text-gray-500 mt-1">
                  Checked in at {typeof dashboardData.overview.checkInTime === 'object' 
                    ? dashboardData.overview.checkInTime.time 
                    : dashboardData.overview.checkInTime}
                </p>
              )}
              {dashboardData?.employee?.shift && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Assigned Shift</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatShiftTime(dashboardData.employee.shift.startTime)} - {formatShiftTime(dashboardData.employee.shift.endTime)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notices Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Company Notices
            </CardTitle>
            <CardDescription>Latest announcements and updates</CardDescription>
          </div>
          {(user?.role === 'admin' || user?.role === 'hr') && (
            <Link href="/notices">
              <Button variant="outline" size="sm">
                Manage Notices
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {noticesLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : notices.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No active notices</p>
          ) : (
            <div className="space-y-3">
              {notices.map((notice) => (
                <div key={notice.id} className="border-l-4 pl-4 py-2 rounded-r-lg bg-gray-50"
                  style={{
                    borderLeftColor: notice.priority === 'High' ? '#ef4444' : notice.priority === 'Medium' ? '#f59e0b' : '#10b981'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{notice.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notice.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className={`px-2 py-0.5 rounded ${
                          notice.category === 'Urgent' ? 'bg-red-100 text-red-700' :
                          notice.category === 'Holiday' ? 'bg-green-100 text-green-700' :
                          notice.category === 'Event' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {notice.category}
                        </span>
                        <span>Posted by {notice.postedBy?.name || 'Admin'}</span>
                        <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setErrorModal(null)} />
          
          <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 border border-white/20">
            {/* Header with Background Pattern */}
            <div className={`relative h-32 flex items-center justify-center ${
              errorModal.type === 'radius' ? 'bg-amber-500' : 'bg-rose-500'
            }`}>
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="relative bg-white/20 backdrop-blur-md rounded-full p-4 ring-8 ring-white/10">
                {errorModal.type === 'location' ? <MapPinOff size={48} className="text-white" /> :
                 errorModal.type === 'radius' ? <MapPin size={48} className="text-white" /> :
                 <XCircle size={48} className="text-white" />}
              </div>
              <button 
                onClick={() => setErrorModal(null)}
                className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase">
                  {errorModal.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {errorModal.message}
                </p>
              </div>

              {/* Troubleshooting Guide */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 mb-8 border border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info size={14} />
                  How to Fix
                </h4>
                <ul className="space-y-3">
                  {errorModal.type === 'location' ? (
                    <>
                      <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 text-[10px] font-bold text-rose-600">1</span>
                        <span>Click the <span className="font-bold underline">Lock / Settings</span> icon in your address bar.</span>
                      </li>
                      <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 text-[10px] font-bold text-rose-600">2</span>
                        <span>Set <span className="font-bold underline">Location</span> to <span className="font-bold text-green-600">"Allow"</span>.</span>
                      </li>
                    </>
                  ) : errorModal.type === 'radius' ? (
                    <>
                      <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-[10px] font-bold text-amber-600">1</span>
                        <span>Ensure you are physically present at the office premises.</span>
                      </li>
                      <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-[10px] font-bold text-amber-600">2</span>
                        <span>If you are working remotely, switch to <span className="font-bold underline">WFH mode</span>.</span>
                      </li>
                    </>
                  ) : (
                    <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                       <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-[10px] font-bold text-blue-600">!</span>
                       <span>Please check your connection and try again later.</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                {workMode === 'office' && (
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-2xl font-bold border-2"
                    onClick={() => {
                      setWorkMode('wfh');
                      setErrorModal(null);
                    }}
                  >
                    Switch to WFH Mode
                  </Button>
                )}
                <Button 
                  className={`w-full h-12 rounded-2xl font-bold shadow-lg transform active:scale-95 transition-all ${
                    errorModal.type === 'radius' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                  onClick={() => setErrorModal(null)}
                >
                  Got it, thanks!
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
