"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getShifts, createShift, updateShift, deleteShift, WorkShift, CreateShiftInput } from "../../../services/shiftService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Loader2, Plus, Clock, Trash2, Edit2, Save, X, Sun, Moon, Search, CalendarCheck } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PageHeader } from "../../../components/ui/PageHeader";

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ShiftsPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
  
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<CreateShiftInput>({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    lateThreshold: 15,
  });

  const canManage = hasRole(["admin", "hr", "manager"]);

  const filteredShifts = shifts.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.workingDays.some(d => d.toLowerCase().includes(q));
  });

  const dayShiftsCount = shifts.filter(s => !s.name.toLowerCase().includes('night')).length;
  const nightShiftsCount = shifts.filter(s => s.name.toLowerCase().includes('night')).length;
  const coveredDaysCount = new Set(shifts.flatMap(s => s.workingDays)).size;

  useEffect(() => {
    if (user?.companyId) {
      fetchShifts();
    }
  }, [user?.companyId]);

  const fetchShifts = async () => {
    try {
      setIsLoading(true);
      const data = await getShifts(user!.companyId);
      setShifts(data);
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
      addToast({ type: "error", title: "Error", description: "Failed to fetch shifts" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (shift?: WorkShift) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        workingDays: shift.workingDays,
        lateThreshold: shift.lateThreshold,
      });
    } else {
      setEditingShift(null);
      setFormData({
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        lateThreshold: 15,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingShift(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;
    
    setIsSubmitting(true);
    
    try {
      const data = { ...formData, companyId: user.companyId };
      if (editingShift) {
        await updateShift(editingShift._id, data);
        addToast({ type: "success", title: "Success", description: "Shift updated successfully" });
      } else {
        await createShift(data);
        addToast({ type: "success", title: "Success", description: "Shift created successfully" });
      }
      handleCloseModal();
      fetchShifts();
    } catch (error) {
      console.error("Failed to save shift:", error);
      addToast({ type: "error", title: "Error", description: "Failed to save shift" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;
    
    try {
      await deleteShift(id);
      addToast({ type: "success", title: "Success", description: "Shift deleted successfully" });
      fetchShifts();
    } catch (error) {
      console.error("Failed to delete shift:", error);
      addToast({ type: "error", title: "Error", description: "Failed to delete shift" });
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDuration = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let hours = endH - startH;
    let mins = endM - startM;
    if (mins < 0) {
      hours--;
      mins += 60;
    }
    if (hours < 0) hours += 24;
    return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <PageHeader
        icon={<Clock />}
        title="Work Shifts"
        description="Manage employee work schedules, shift rules, and daily timings"
        actions={
          canManage && (
            <Button size="sm" onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Shift
            </Button>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Shifts', value: shifts.length, icon: Clock },
          { label: 'Day Shifts', value: dayShiftsCount, icon: Sun },
          { label: 'Night Shifts', value: nightShiftsCount, icon: Moon },
          { label: 'Days Covered', value: `${coveredDaysCount} / 7`, icon: CalendarCheck },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-[14px] border border-border bg-card shadow-xs">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-foreground">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tracking-tight text-foreground font-display">{value}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search shifts by name or schedule..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 text-sm border-border bg-card"
        />
      </div>

      {/* Shifts Grid or Empty State */}
      {filteredShifts.length === 0 ? (
        <Card className="rounded-[14px] border border-border bg-card shadow-xs">
          <EmptyState
            icon={<Clock size={18} />}
            title={shifts.length === 0 ? "No shifts configured yet" : "No matching shifts found"}
            description={
              shifts.length === 0
                ? "Configure daily work schedules, grace periods, and working day policies."
                : "Try adjusting your search query to find configured shifts."
            }
            action={
              canManage ? (
                <Button size="sm" onClick={() => handleOpenModal()}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  {shifts.length === 0 ? "Create First Shift" : "Add Shift"}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShifts.map((shift) => (
            <Card key={shift._id} className="rounded-[14px] border border-border bg-card shadow-xs hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {shift.name.toLowerCase().includes('night') ? (
                      <Moon className="h-5 w-5 text-primary" />
                    ) : (
                      <Sun className="h-5 w-5 text-amber-500" />
                    )}
                    {shift.name}
                  </CardTitle>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(shift)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 dark:text-red-400"
                        onClick={() => handleDelete(shift._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardDescription>
                  {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium text-foreground">{getDuration(shift.startTime, shift.endTime)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Late Threshold</span>
                  <span className="font-medium text-foreground">{shift.lateThreshold} mins</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Working Days</p>
                  <div className="flex flex-wrap gap-1">
                    {daysOfWeek.map(day => (
                      <span
                        key={day}
                        className={`text-xs px-2 py-1 rounded ${
                          shift.workingDays.includes(day)
                            ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                            : 'bg-muted/40 text-muted-foreground/60 border border-transparent'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingShift ? 'Edit Shift' : 'Create Shift'}</CardTitle>
              <CardDescription>
                {editingShift ? 'Update shift details' : 'Add a new work schedule'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Shift Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Day Shift, Night Shift"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Start Time</label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">End Time</label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">Working Days</label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                          formData.workingDays.includes(day)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-slate-300">
                    Late Threshold (minutes)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={formData.lateThreshold}
                    onChange={(e) => setFormData({...formData, lateThreshold: parseInt(e.target.value)})}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
                    Minutes after start time to mark as late
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {editingShift ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
