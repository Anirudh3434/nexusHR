"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType, LeaveType } from "../../../services/leaveTypeService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Palmtree, Plus, Pencil, Trash2, Loader2, X, DollarSign, Gift, Heart } from "lucide-react";

const defaultColors = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
];

// Preset leave types
const presetLeaveTypes = [
  { name: 'Paid Leave', code: 'PL', description: 'Annual paid leave entitlement', defaultDays: 12, isPaid: true, color: '#10B981' },
  { name: 'Casual Leave', code: 'CL', description: 'Short notice casual leave', defaultDays: 6, isPaid: true, color: '#3B82F6' },
  { name: 'Sick Leave', code: 'SL', description: 'Medical/health related leave', defaultDays: 6, isPaid: true, color: '#EF4444' },
  { name: 'Earned Leave', code: 'EL', description: 'Leave earned based on attendance', defaultDays: 0, isPaid: true, color: '#8B5CF6' },
  { name: 'Unpaid Leave', code: 'UL', description: 'Leave without pay', defaultDays: 0, isPaid: false, color: '#6B7280' },
];

export default function LeaveTypesPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
  
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    defaultDays: 0,
    isPaid: true,
    color: '#3B82F6',
  });

  const canManage = hasRole(["admin", "hr"]);

  useEffect(() => {
    if (user?.companyId) fetchLeaveTypes();
  }, [user]);

  const fetchLeaveTypes = async () => {
    try {
      setIsLoading(true);
      const data = await getLeaveTypes(user!.companyId!);
      setLeaveTypes(data);
    } catch (error) {
      console.error("Failed to fetch leave types:", error);
      addToast({ type: "error", title: "Error", description: "Failed to fetch leave types" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;
    
    setIsSubmitting(true);
    try {
      if (editingType) {
        await updateLeaveType(editingType._id, formData);
        addToast({ type: "success", title: "Success", description: "Leave type updated" });
      } else {
        await createLeaveType({ ...formData, companyId: user.companyId, isActive: true });
        addToast({ type: "success", title: "Success", description: "Leave type created" });
      }
      resetForm();
      fetchLeaveTypes();
    } catch (error) {
      console.error("Failed to save leave type:", error);
      addToast({ type: "error", title: "Error", description: "Failed to save leave type" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this leave type?")) return;
    
    try {
      await deleteLeaveType(id);
      addToast({ type: "success", title: "Success", description: "Leave type deleted" });
      fetchLeaveTypes();
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to delete leave type" });
    }
  };

  const handleAddPreset = async (preset: typeof presetLeaveTypes[0]) => {
    if (!user?.companyId) return;
    
    try {
      await createLeaveType({ ...preset, companyId: user.companyId, isActive: true });
      addToast({ type: "success", title: "Success", description: `${preset.name} added` });
      fetchLeaveTypes();
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to add preset" });
    }
  };

  const openEditModal = (type: LeaveType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      code: type.code,
      description: type.description || '',
      defaultDays: type.defaultDays,
      isPaid: type.isPaid,
      color: type.color,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingType(null);
    setFormData({ name: '', code: '', description: '', defaultDays: 0, isPaid: true, color: '#3B82F6' });
  };

  if (!user || !canManage) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Palmtree className="h-8 w-8 text-blue-600" />
            Leave Types
          </h1>
          <p className="text-gray-500">Define leave categories and default allocations for employees.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPresetModal(true)}>
            <Gift className="mr-2 h-4 w-4" />
            Add Presets
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Custom
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Leave Types</CardTitle>
          <CardDescription>These leave types will be available when assigning leave balances to employees.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : leaveTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Palmtree className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No leave types found. Create some or add presets.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Default Days</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.map((type) => (
                  <TableRow key={type._id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {type.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500">{type.description || '-'}</TableCell>
                    <TableCell>{type.defaultDays} days/year</TableCell>
                    <TableCell>
                      {type.isPaid ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <DollarSign className="h-3 w-3" />
                          Paid
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">Unpaid</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(type)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(type._id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingType ? "Edit Leave Type" : "Add Leave Type"}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Paid Leave"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., PL"
                    maxLength={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Days *</label>
                  <Input
                    type="number"
                    value={formData.defaultDays}
                    onChange={(e) => setFormData({...formData, defaultDays: parseInt(e.target.value) || 0})}
                    min={0}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {defaultColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({...formData, color: color.value})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color.value ? 'border-gray-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPaid"
                  checked={formData.isPaid}
                  onChange={(e) => setFormData({...formData, isPaid: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="isPaid" className="text-sm text-gray-700">Paid Leave</label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingType ? "Update" : "Create")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Quick Add Presets
              </h2>
              <button onClick={() => setShowPresetModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {presetLeaveTypes.map((preset) => {
                const alreadyExists = leaveTypes.some(t => t.code === preset.code);
                return (
                  <div key={preset.code} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: preset.color }}
                      />
                      <div>
                        <p className="font-medium">{preset.name} ({preset.code})</p>
                        <p className="text-xs text-gray-500">{preset.description} • {preset.defaultDays} days • {preset.isPaid ? 'Paid' : 'Unpaid'}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleAddPreset(preset)}
                      disabled={alreadyExists}
                      variant={alreadyExists ? "ghost" : "default"}
                    >
                      {alreadyExists ? 'Added' : 'Add'}
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t">
              <Button variant="outline" className="w-full" onClick={() => setShowPresetModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
