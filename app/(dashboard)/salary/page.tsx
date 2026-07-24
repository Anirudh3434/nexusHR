"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getSalaries, createSalary, updateSalary, deleteSalary, SalaryStructure, CreateSalaryInput } from "../../../services/salaryService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Loader2, Plus, Trash2, Edit2, Save, X, DollarSign, Calculator, TrendingUp, TrendingDown } from "lucide-react";

export default function SalaryPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
  
  const [salaries, setSalaries] = useState<SalaryStructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryStructure | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<CreateSalaryInput>>({
    basicSalary: 0,
    hra: 0,
    da: 0,
    conveyance: 0,
    medical: 0,
    specialAllowance: 0,
    pf: 0,
    esi: 0,
    tds: 0,
    professionalTax: 0,
    notes: '',
  });

  const canManage = hasRole(["admin", "hr"]);

  useEffect(() => {
    if (user?.companyId) {
      fetchSalaries();
    }
  }, [user]);

  const fetchSalaries = async () => {
    try {
      setIsLoading(true);
      const data = await getSalaries({ companyId: user!.companyId! });
      setSalaries(data);
    } catch (error) {
      console.error("Failed to fetch salaries:", error);
      addToast({ type: "error", title: "Error", description: "Failed to fetch salary data" });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    const basic = formData.basicSalary || 0;
    const hra = formData.hra || Math.round(basic * 0.4);
    const da = formData.da || 0;
    const conveyance = formData.conveyance || 0;
    const medical = formData.medical || 0;
    const special = formData.specialAllowance || 0;
    
    const gross = basic + hra + da + conveyance + medical + special;
    
    const pf = formData.pf || Math.min(Math.round(basic * 0.12), 1800);
    const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
    const tds = formData.tds || 0;
    const pt = formData.professionalTax || 0;
    
    const deductions = pf + esi + tds + pt;
    const net = gross - deductions;
    
    const employerPf = pf;
    const employerEsi = gross <= 21000 ? Math.round(gross * 0.0325) : 0;
    const ctc = gross + employerPf + employerEsi;
    
    return { gross, deductions, net, ctc, hra, pf, esi };
  };

  const handleOpenModal = (salary?: SalaryStructure) => {
    if (salary) {
      setEditingSalary(salary);
      setFormData({
        basicSalary: salary.basicSalary,
        hra: salary.hra,
        da: salary.da,
        conveyance: salary.conveyance,
        medical: salary.medical,
        specialAllowance: salary.specialAllowance,
        pf: salary.pf,
        esi: salary.esi,
        tds: salary.tds,
        professionalTax: salary.professionalTax,
        notes: salary.notes,
      });
    } else {
      setEditingSalary(null);
      setFormData({
        basicSalary: 0,
        hra: 0,
        da: 0,
        conveyance: 0,
        medical: 0,
        specialAllowance: 0,
        pf: 0,
        esi: 0,
        tds: 0,
        professionalTax: 0,
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;
    
    setIsSubmitting(true);
    const totals = calculateTotals();
    
    try {
      const data: CreateSalaryInput = {
        companyId: user.companyId,
        employeeId: '', // Would be selected from dropdown in real implementation
        effectiveDate: new Date().toISOString(),
        basicSalary: formData.basicSalary || 0,
        hra: totals.hra,
        da: formData.da || 0,
        conveyance: formData.conveyance || 0,
        medical: formData.medical || 0,
        specialAllowance: formData.specialAllowance || 0,
        pf: totals.pf,
        esi: totals.esi,
        tds: formData.tds || 0,
        professionalTax: formData.professionalTax || 0,
        notes: formData.notes || '',
        createdBy: user.id || '',
      };
      
      if (editingSalary) {
        await updateSalary(editingSalary._id, data);
        addToast({ type: "success", title: "Success", description: "Salary updated successfully" });
      } else {
        await createSalary(data);
        addToast({ type: "success", title: "Success", description: "Salary created successfully" });
      }
      setIsModalOpen(false);
      fetchSalaries();
    } catch (error) {
      console.error("Failed to save salary:", error);
      addToast({ type: "error", title: "Error", description: "Failed to save salary" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this salary record?")) return;
    
    try {
      await deleteSalary(id);
      addToast({ type: "success", title: "Success", description: "Salary record deleted" });
      fetchSalaries();
    } catch (error) {
      console.error("Failed to delete salary:", error);
      addToast({ type: "error", title: "Error", description: "Failed to delete salary" });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Salary Structures
          </h1>
          <p className="text-gray-500">Manage employee salary components and calculations</p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Salary
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Gross</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(salaries.reduce((sum, s) => sum + s.grossSalary, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Net</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(salaries.reduce((sum, s) => sum + s.netSalary, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calculator className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total CTC</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(salaries.reduce((sum, s) => sum + s.ctc, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Deductions</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(salaries.reduce((sum, s) => sum + s.totalDeductions, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Salary Details</CardTitle>
          <CardDescription>Comprehensive salary breakdown for all employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Employee</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Basic</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">HRA</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Gross</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Deductions</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Net Salary</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">CTC</th>
                  {canManage && <th className="text-center px-4 py-3 font-medium text-gray-700">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {salaries.map((salary) => (
                  <tr key={salary._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{salary.employeeId?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{salary.employeeId?.designation}</div>
                    </td>
                    <td className="text-right px-4 py-3">{formatCurrency(salary.basicSalary)}</td>
                    <td className="text-right px-4 py-3">{formatCurrency(salary.hra)}</td>
                    <td className="text-right px-4 py-3 font-medium text-blue-600">{formatCurrency(salary.grossSalary)}</td>
                    <td className="text-right px-4 py-3 text-red-600">{formatCurrency(salary.totalDeductions)}</td>
                    <td className="text-right px-4 py-3 font-medium text-green-600">{formatCurrency(salary.netSalary)}</td>
                    <td className="text-right px-4 py-3 font-medium text-purple-600">{formatCurrency(salary.ctc)}</td>
                    {canManage && (
                      <td className="text-center px-4 py-3">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(salary)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(salary._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {salaries.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No salary records found</p>
              {canManage && (
                <Button onClick={() => handleOpenModal()} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Record
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingSalary ? 'Edit Salary Structure' : 'Create Salary Structure'}</CardTitle>
              <CardDescription>
                {editingSalary ? 'Update salary components' : 'Define new salary structure'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Salary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary</label>
                  <Input
                    type="number"
                    value={formData.basicSalary || ''}
                    onChange={(e) => setFormData({...formData, basicSalary: parseInt(e.target.value) || 0})}
                    placeholder="Enter basic salary"
                    required
                  />
                </div>

                {/* Allowances Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HRA (Auto: 40%)</label>
                    <Input
                      type="number"
                      value={formData.hra || totals.hra}
                      onChange={(e) => setFormData({...formData, hra: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DA</label>
                    <Input
                      type="number"
                      value={formData.da || ''}
                      onChange={(e) => setFormData({...formData, da: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conveyance</label>
                    <Input
                      type="number"
                      value={formData.conveyance || ''}
                      onChange={(e) => setFormData({...formData, conveyance: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical</label>
                    <Input
                      type="number"
                      value={formData.medical || ''}
                      onChange={(e) => setFormData({...formData, medical: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                {/* Deductions */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PF (Auto: 12%)</label>
                    <Input
                      type="number"
                      value={formData.pf || totals.pf}
                      onChange={(e) => setFormData({...formData, pf: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ESI (Auto)</label>
                    <Input
                      type="number"
                      value={formData.esi || totals.esi}
                      onChange={(e) => setFormData({...formData, esi: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TDS</label>
                    <Input
                      type="number"
                      value={formData.tds || ''}
                      onChange={(e) => setFormData({...formData, tds: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Professional Tax</label>
                    <Input
                      type="number"
                      value={formData.professionalTax || ''}
                      onChange={(e) => setFormData({...formData, professionalTax: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                {/* Calculated Totals */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gross Salary:</span>
                    <span className="font-medium text-blue-600">{formatCurrency(totals.gross)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Deductions:</span>
                    <span className="font-medium text-red-600">{formatCurrency(totals.deductions)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Net Salary:</span>
                    <span className="font-medium text-green-600">{formatCurrency(totals.net)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-gray-600">CTC:</span>
                    <span className="font-medium text-purple-600">{formatCurrency(totals.ctc)}</span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <Input
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Any additional notes..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {editingSalary ? 'Update' : 'Create'}
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
