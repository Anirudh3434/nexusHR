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

import WelcomeBriefingModal from "../../../components/WelcomeBriefingModal";
import HRChatbot from "../../../components/ai/HRChatbot";
import {
  WorksuiteHeader,
  QuickMetricsBar,
  ExecutiveProfileCard,
  TeamPresenceHub,
  CelebrationHub,
  SprintTasksBoard,
  ProjectPortfolioGrid,
  AgendaScheduleWidget,
  SupportDeskWidget,
} from "../../../components/dashboard/WorksuiteDashboardWidgets";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [showWelcomeBriefing, setShowWelcomeBriefing] = useState<boolean>(false);

  const handleCloseWelcomeBriefing = () => {
    setShowWelcomeBriefing(false);
  };

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top Worksuite Header Bar & Action Controls */}
      <WorksuiteHeader
        userName={dashboardData?.employee?.name || user?.name || "Employee"}
        activeShift={activeShift}
        elapsedTime={elapsedTime}
        isProcessing={isProcessing}
        workMode={workMode}
        setWorkMode={setWorkMode}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onLogout={logout}
      />

      {/* 2. Top Quick Metrics Bar */}
      <QuickMetricsBar
        tasksPending={dashboardData?.widgets?.tasksSummary?.pending ?? 0}
        tasksOverdue={dashboardData?.widgets?.tasksSummary?.overdue ?? 0}
        projectsCount={dashboardData?.widgets?.projectsSummary?.inProgress ?? 0}
        awayCount={dashboardData?.widgets?.onLeave?.length ?? 0}
        nextBirthdayText={dashboardData?.widgets?.birthdays?.[0] ? `${dashboardData.widgets.birthdays[0].name.split(' ')[0]} (${dashboardData.widgets.birthdays[0].formattedDate})` : "None this week"}
      />

      {/* 3. Main Dashboard Bento Architecture (4 cols left / 8 cols right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Command & Pulse - 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <ExecutiveProfileCard
            name={dashboardData?.employee?.name || user?.name || "Employee"}
            designation={dashboardData?.employee?.designation || (user as any)?.designation || "Software Developer"}
            employeeId={dashboardData?.employee?.employeeId || (user as any)?.employeeId || "—"}
            department={dashboardData?.employee?.department || (user as any)?.department || "Engineering"}
            avatar={dashboardData?.employee?.avatar || user?.avatar}
            openTasksCount={dashboardData?.widgets?.tasksSummary?.open ?? dashboardData?.employee?.openTasks ?? 0}
            projectsCount={dashboardData?.widgets?.projectsSummary?.inProgress ?? dashboardData?.employee?.totalProjects ?? 0}
            workShift={dashboardData?.employee?.shift}
          />

          <TeamPresenceHub
            onLeave={dashboardData?.widgets?.onLeave}
            joinings={dashboardData?.widgets?.joiningToday}
            anniversaries={dashboardData?.widgets?.anniversaries}
          />

          <CelebrationHub birthdays={dashboardData?.widgets?.birthdays} />
        </div>

        {/* Right Column (Execution & Roadmap - 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <SprintTasksBoard tasks={dashboardData?.widgets?.myTasks} />

          <ProjectPortfolioGrid projects={dashboardData?.widgets?.projects} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AgendaScheduleWidget schedule={dashboardData?.widgets?.calendarSchedule} />
            <SupportDeskWidget tickets={dashboardData?.widgets?.tickets} />
          </div>
        </div>

      </div>

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

      {showWelcomeBriefing && user && (
        <WelcomeBriefingModal
          userName={user.name || "User"}
          assignedTaskCount={dashboardData?.assignedTasksCount || 3}
          unreadNoticeCount={notices?.length || 2}
          shiftStatusStr={activeShift ? "Shift Active" : "Shift Not Started"}
          onClose={handleCloseWelcomeBriefing}
        />
      )}

      <HRChatbot />
    </div>
  );
}
