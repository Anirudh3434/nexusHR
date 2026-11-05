"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { getLiveFieldAttendance } from "@/services/attendanceService";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { 
  MapPin, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  Users, 
  Radio, 
  Coffee, 
  Home, 
  Building2, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";

// Dynamically import Leaflet Map to ensure no SSR errors
const LiveFieldTrackingMap = dynamic(
  () => import("@/components/attendance/LiveFieldTrackingMap"),
  { ssr: false }
);

interface WorkerItem {
  attendanceId: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  avatar?: string;
  phone?: string;
  workMode: "office" | "wfh" | "field";
  checkInTime?: string;
  checkOutTime?: string;
  isOnBreak: boolean;
  trackingState: "active" | "break" | "wfh" | "office" | "completed";
  lastLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number | null;
    heading?: number | null;
    updatedAt?: string | Date;
  } | null;
  breaksCount: number;
}

export default function FieldTrackingPage() {
  const { user, hasRole } = useAuth();
  const { socket, isConnected } = useSocket(user?.id);

  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const isAuthorized = hasRole(["admin", "hr", "manager"]) || (user?.role as any) === "super_admin";

  // Fetch initial field attendance list
  const loadWorkers = async () => {
    try {
      setLoading(true);
      const data = await getLiveFieldAttendance();
      setWorkers(data);
    } catch (err: any) {
      console.error("Failed to load field workers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadWorkers();
    }
  }, [isAuthorized]);

  // Join WebSocket supervisor room for live GPS telemetry
  useEffect(() => {
    if (!socket || !isAuthorized) return;

    // Join room for CEO / Admin / HR field updates
    socket.emit("join-field-tracking");

    // Real-time location ping
    const handleLocationPing = (ping: any) => {
      setWorkers((prev) =>
        prev.map((w) => {
          if (w.employeeId === ping.employeeId) {
            return {
              ...w,
              trackingState: "active",
              isOnBreak: false,
              lastLocation: {
                lat: ping.lat,
                lng: ping.lng,
                accuracy: ping.accuracy,
                speed: ping.speed,
                heading: ping.heading,
                updatedAt: ping.timestamp || new Date().toISOString(),
              },
            };
          }
          return w;
        })
      );
    };

    // Real-time status ping (break / resume / end)
    const handleStatusPing = (ping: any) => {
      setWorkers((prev) =>
        prev.map((w) => {
          if (w.employeeId === ping.employeeId) {
            const newState = ping.status === "break" ? "break" : ping.status === "completed" ? "completed" : "active";
            return {
              ...w,
              trackingState: newState,
              isOnBreak: ping.status === "break",
            };
          }
          return w;
        })
      );
    };

    socket.on("employee-location-ping", handleLocationPing);
    socket.on("employee-status-ping", handleStatusPing);

    return () => {
      socket.off("employee-location-ping", handleLocationPing);
      socket.off("employee-status-ping", handleStatusPing);
    };
  }, [socket, isAuthorized]);

  // Filter workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const matchesSearch =
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.designation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && w.trackingState === "active") ||
        (statusFilter === "break" && w.trackingState === "break") ||
        (statusFilter === "wfh" && w.trackingState === "wfh");

      return matchesSearch && matchesStatus;
    });
  }, [workers, searchQuery, statusFilter]);

  // Map markers for map component
  const mapMarkers = useMemo(() => {
    return workers
      .filter((w) => w.lastLocation && typeof w.lastLocation.lat === "number" && typeof w.lastLocation.lng === "number")
      .map((w) => ({
        employeeId: w.employeeId,
        name: w.name,
        department: w.department,
        designation: w.designation,
        trackingState: w.trackingState,
        lat: w.lastLocation!.lat,
        lng: w.lastLocation!.lng,
        accuracy: w.lastLocation?.accuracy,
        speed: w.lastLocation?.speed,
        updatedAt: w.lastLocation?.updatedAt,
      }));
  }, [workers]);

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-1">
          Only CEOs, Admins, and HR Managers can view live field tracking maps.
        </p>
      </div>
    );
  }

  const activeCount = workers.filter((w) => w.trackingState === "active").length;
  const breakCount = workers.filter((w) => w.trackingState === "break").length;
  const wfhCount = workers.filter((w) => w.trackingState === "wfh").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Field Force Tracking"
        description="Real-time GPS tracking for field personnel with strict privacy controls for breaks and WFH"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{activeCount} Live on Field</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadWorkers}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Active on Field</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">On Break (Paused)</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{breakCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Work From Home</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{wfhCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
              <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Privacy Status</p>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Guaranteed
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Radio className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Sidebar List + Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
        {/* Workers List Column */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 h-full flex flex-col">
            <CardHeader className="pb-3 pt-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Field Personnel
                </CardTitle>
                <span className="text-xs text-slate-400">
                  {filteredWorkers.length} total
                </span>
              </div>

              {/* Search & Filter */}
              <div className="pt-2 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <Input
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {["all", "active", "break", "wfh"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-medium capitalize transition-all ${
                        statusFilter === tab
                          ? "bg-primary text-white shadow-xs"
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-3 overflow-y-auto max-h-[500px] divide-y divide-slate-100 dark:divide-slate-800">
              {filteredWorkers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No staff matching filter today
                </div>
              ) : (
                filteredWorkers.map((worker) => {
                  const isSelected = worker.employeeId === selectedWorkerId;
                  const hasLocation = !!worker.lastLocation;

                  return (
                    <div
                      key={worker.employeeId}
                      onClick={() => hasLocation && setSelectedWorkerId(worker.employeeId)}
                      className={`p-3 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                            {worker.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                              worker.trackingState === "active"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : worker.trackingState === "break"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : worker.trackingState === "wfh"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {worker.trackingState === "active"
                              ? "Live Duty"
                              : worker.trackingState === "break"
                              ? "On Break"
                              : worker.trackingState === "wfh"
                              ? "WFH (Protected)"
                              : worker.trackingState}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          {worker.designation} • {worker.department}
                        </div>

                        {worker.trackingState === "active" && worker.lastLocation && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>
                              Accuracy ±{Math.round(worker.lastLocation.accuracy || 0)}m
                              {worker.lastLocation.speed ? ` • ${worker.lastLocation.speed} km/h` : ""}
                            </span>
                          </div>
                        )}

                        {worker.trackingState === "break" && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Coffee className="w-3 h-3" />
                            <span>GPS Paused for Privacy</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">In: {worker.checkInTime || "--:--"}</span>
                        {hasLocation && (
                          <span className="text-[10px] text-primary underline mt-1 inline-block">
                            Pan to Map
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map Column */}
        <div className="lg:col-span-8 flex flex-col">
          <LiveFieldTrackingMap
            workers={mapMarkers}
            selectedWorkerId={selectedWorkerId}
            onSelectWorker={(id) => setSelectedWorkerId(id)}
          />
        </div>
      </div>
    </div>
  );
}
