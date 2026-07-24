"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getShifts, createShift, updateShift, deleteShift, WorkShift, CreateShiftInput } from "../../../services/shiftService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Loader2, Plus, Clock, Trash2, Edit2, Save, X, Sun, Moon } from "lucide-react";

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ShiftsPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
  
  const [shifts, setShifts] = useState<WorkShift[]>([]);
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

  useEffect(() => {
    if (user?.companyId) {
      fetchShifts();
    }
  }, [user]);

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
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-8 w-8 text-blue-600" />
            Work Shifts
          </h1>
          <p className="text-gray-500">Manage employee work schedules and shifts</p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Shift
          </Button>
        )}
      </div>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts.map((shift) => (
          <Card key={shift._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {shift.name.toLowerCase().includes('night') ? (
                    <Moon className="h-5 w-5 text-indigo-500" />
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
                      className="text-red-600"
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
                <span className="text-gray-500">Duration</span>
                <span className="font-medium">{getDuration(shift.startTime, shift.endTime)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Late Threshold</span>
                <span className="font-medium">{shift.lateThreshold} mins</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500 mb-2">Working Days</p>
                <div className="flex flex-wrap gap-1">
                  {daysOfWeek.map(day => (
                    <span
                      key={day}
                      className={`text-xs px-2 py-1 rounded ${
                        shift.workingDays.includes(day)
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-400'
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

      {shifts.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No shifts configured yet</p>
            {canManage && (
              <Button onClick={() => handleOpenModal()} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create First Shift
              </Button>
            )}
          </CardContent>
        </Card>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Day Shift, Night Shift"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Working Days</label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                          formData.workingDays.includes(day)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <p className="text-xs text-gray-500 mt-1">
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
