"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { 
  getLeaveEntitlements, 
  createLeaveEntitlement, 
  updateLeaveEntitlement, 
  deleteLeaveEntitlement,
  calculateYearsOfService,
  LeaveEntitlement
} from "../../../services/leaveEntitlementService";
import { getLeaveTypes, LeaveType } from "../../../services/leaveTypeService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Award, Plus, Pencil, Trash2, Loader2, X, Calculator, Calendar } from "lucide-react";

// Preset experience tiers
const experienceTiers = [
  { name: "New Joiner (0-1 Years)", min: 0, max: 1 },
  { name: "Junior (1-3 Years)", min: 1, max: 3 },
  { name: "Mid-Level (3-5 Years)", min: 3, max: 5 },
  { name: "Senior (5-10 Years)", min: 5, max: 10 },
  { name: "Expert (10+ Years)", min: 10, max: null },
];

export default function LeaveEntitlementsPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
  
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEntitlement, setEditingEntitlement] = useState<LeaveEntitlement | null>(null);
  
  // Calculator state
  const [calcJoiningDate, setCalcJoiningDate] = useState('');
  const [calcExperience, setCalcExperience] = useState(0);
  const [calcResults, setCalcResults] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    tierName: '',
    minYears: 0,
    maxYears: null as number | null,
    daysPerYear: 12,
    accrualType: 'yearly' as 'yearly' | 'monthly' | 'quarterly',
    canCarryForward: true,
    maxCarryForwardDays: 0,
  });

  const canManage = hasRole(["admin", "hr"]);

  useEffect(() => {
    if (user?.companyId) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [entData, typeData] = await Promise.all([
        getLeaveEntitlements({ companyId: user!.companyId! }),
        getLeaveTypes(user!.companyId!)
      ]);
      setEntitlements(entData);
      setLeaveTypes(typeData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      addToast({ type: "error", title: "Error", description: "Failed to fetch data" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;
    
    setIsSubmitting(true);
    try {
      if (editingEntitlement) {
        await updateLeaveEntitlement(editingEntitlement._id, { ...formData, isActive: true });
        addToast({ type: "success", title: "Success", description: "Entitlement updated" });
      } else {
        await createLeaveEntitlement({ ...formData, companyId: user.companyId, isActive: true });
        addToast({ type: "success", title: "Success", description: "Entitlement created" });
      }
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Failed to save entitlement:", error);
      addToast({ type: "error", title: "Error", description: "Failed to save entitlement" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will affect leave calculations.")) return;
    
    try {
      await deleteLeaveEntitlement(id);
      addToast({ type: "success", title: "Success", description: "Entitlement deleted" });
      fetchData();
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to delete" });
    }
  };

  const calculateExperience = () => {
    if (!calcJoiningDate) return;
    const years = calculateYearsOfService(calcJoiningDate);
    setCalcExperience(years);
    
    // Find applicable entitlements
    const applicable = entitlements.filter(e => {
      const minMatch = years >= e.minYears;
      const maxMatch = e.maxYears === null || years < e.maxYears;
      return minMatch && maxMatch;
    });
    setCalcResults(applicable);
  };

  const openEditModal = (ent: LeaveEntitlement) => {
    setEditingEntitlement(ent);
    setFormData({
      leaveTypeId: (ent.leaveTypeId as any)?._id || (ent.leaveTypeId as string),
      tierName: ent.tierName,
      minYears: ent.minYears,
      maxYears: ent.maxYears,
      daysPerYear: ent.daysPerYear,
      accrualType: ent.accrualType,
      canCarryForward: ent.canCarryForward,
      maxCarryForwardDays: ent.maxCarryForwardDays,
    });
    setShowModal(true);
  };

  const selectTier = (tier: typeof experienceTiers[0]) => {
    setFormData({
      ...formData,
      tierName: tier.name,
      minYears: tier.min,
      maxYears: tier.max,
    });
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingEntitlement(null);
    setFormData({
      leaveTypeId: '',
      tierName: '',
      minYears: 0,
      maxYears: null,
      daysPerYear: 12,
      accrualType: 'yearly',
      canCarryForward: true,
      maxCarryForwardDays: 0,
    });
  };

  if (!user || !canManage) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-8 w-8 text-blue-600" />
            Leave Entitlements
          </h1>
          <p className="text-gray-500">Define leave allocations based on employee experience tiers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCalculator(true)}>
            <Calculator className="mr-2 h-4 w-4" />
            Calculator
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Experience Tiers Reference */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Experience Tiers
          </h3>
          <div className="flex flex-wrap gap-2">
            {experienceTiers.map((tier) => (
              <span 
                key={tier.name} 
                className="text-xs bg-white px-3 py-1 rounded-full border border-blue-200 text-blue-700"
              >
                {tier.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave Entitlement Rules</CardTitle>
          <CardDescription>Employees receive different leave allocations based on their years of service.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : entitlements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No entitlement rules found. Create rules to allocate leave based on experience.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Experience Tier</TableHead>
                  <TableHead>Years</TableHead>
                  <TableHead>Days/Year</TableHead>
                  <TableHead>Accrual</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entitlements.map((ent) => (
                  <TableRow key={ent._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: (ent.leaveTypeId as any)?.color || '#ccc' }}
                        />
                        <span className="font-medium">{(ent.leaveTypeId as any)?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{ent.tierName}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {ent.minYears} - {ent.maxYears === null ? '∞' : ent.maxYears} yrs
                    </TableCell>
                    <TableCell className="font-medium">{ent.daysPerYear} days</TableCell>
                    <TableCell className="capitalize">{ent.accrualType}</TableCell>
                    <TableCell>
                      {ent.canCarryForward ? (
                        <span className="text-green-600 text-sm">Yes (max {ent.maxCarryForwardDays})</span>
                      ) : (
                        <span className="text-gray-400 text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(ent)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(ent._id)} className="text-red-600 hover:text-red-700">
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingEntitlement ? "Edit Entitlement" : "Add Entitlement Rule"}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                <select
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({...formData, leaveTypeId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((type) => (
                    <option key={type._id} value={type._id}>{type.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Experience Tier *</label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {experienceTiers.map((tier) => (
                    <button
                      key={tier.name}
                      type="button"
                      onClick={() => selectTier(tier)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        formData.tierName === tier.name 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium">{tier.name}</span>
                      <span className="text-gray-500 ml-2">({tier.min} - {tier.max === null ? '∞' : tier.max} yrs)</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Years</label>
                  <Input
                    type="number"
                    value={formData.minYears}
                    onChange={(e) => setFormData({...formData, minYears: parseInt(e.target.value) || 0})}
                    min={0}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Years (empty = unlimited)</label>
                  <Input
                    type="number"
                    value={formData.maxYears || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({...formData, maxYears: val === '' ? null : parseInt(val)});
                    }}
                    min={formData.minYears + 1}
                    placeholder="∞"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days Per Year *</label>
                  <Input
                    type="number"
                    value={formData.daysPerYear}
                    onChange={(e) => setFormData({...formData, daysPerYear: parseInt(e.target.value) || 0})}
                    min={0}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accrual Type</label>
                  <select
                    value={formData.accrualType}
                    onChange={(e) => setFormData({...formData, accrualType: e.target.value as any})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="yearly">Yearly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="canCarryForward"
                  checked={formData.canCarryForward}
                  onChange={(e) => setFormData({...formData, canCarryForward: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="canCarryForward" className="text-sm text-gray-700">
                  Allow carry forward to next year
                </label>
              </div>

              {formData.canCarryForward && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Carry Forward Days</label>
                  <Input
                    type="number"
                    value={formData.maxCarryForwardDays}
                    onChange={(e) => setFormData({...formData, maxCarryForwardDays: parseInt(e.target.value) || 0})}
                    min={0}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting || !formData.leaveTypeId || !formData.tierName}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingEntitlement ? "Update" : "Create")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Leave Calculator
              </h2>
              <button onClick={() => setShowCalculator(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Joining Date</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={calcJoiningDate}
                    onChange={(e) => setCalcJoiningDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <Button onClick={calculateExperience} disabled={!calcJoiningDate}>
                    Calculate
                  </Button>
                </div>
              </div>

              {calcExperience > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Experience:</strong> {calcExperience} years of service
                  </p>
                </div>
              )}

              {calcResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Applicable Leave Entitlements:</h3>
                  {calcResults.map((ent) => (
                    <div key={ent._id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: ent.leaveTypeId?.color || '#ccc' }}
                        />
                        <div>
                          <p className="font-medium">{ent.leaveTypeId?.name}</p>
                          <p className="text-xs text-gray-500">{ent.tierName} • {ent.daysPerYear} days/year</p>
                        </div>
                      </div>
                      <span className="text-green-600 font-medium">{ent.daysPerYear} days</span>
                    </div>
                  ))}
                </div>
              )}

              {calcResults.length === 0 && calcExperience > 0 && (
                <p className="text-gray-500 text-center py-4">No entitlements found for this experience level.</p>
              )}
            </div>
            <div className="p-4 border-t">
              <Button variant="outline" className="w-full" onClick={() => setShowCalculator(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
