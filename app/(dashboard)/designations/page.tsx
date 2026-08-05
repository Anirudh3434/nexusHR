"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getDesignations, createDesignation, updateDesignation, deleteDesignation, Designation } from "../../../services/designationService";
import { getDepartments, Department } from "../../../services/departmentService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Briefcase, Plus, Pencil, Trash2, Loader2, X } from "lucide-react";

export default function DesignationsPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  const [formData, setFormData] = useState({ name: '', department: '', description: '' });

  const canManage = hasRole(["admin", "hr"]);

  useEffect(() => {
    if (user?.companyId) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [desigData, deptData] = await Promise.all([
        getDesignations(user!.companyId!),
        getDepartments(user!.companyId!)
      ]);
      setDesignations(desigData);
      setDepartments(deptData);
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
      if (editingDesig) {
        await updateDesignation(editingDesig._id, formData);
        addToast({ type: "success", title: "Success", description: "Designation updated" });
      } else {
        await createDesignation({ ...formData, companyId: user.companyId });
        addToast({ type: "success", title: "Success", description: "Designation created" });
      }
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Failed to save designation:", error);
      addToast({ type: "error", title: "Error", description: "Failed to save designation" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this designation?")) return;

    try {
      await deleteDesignation(id);
      addToast({ type: "success", title: "Success", description: "Designation deleted" });
      fetchData();
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to delete designation" });
    }
  };

  const openEditModal = (desig: Designation) => {
    setEditingDesig(desig);
    setFormData({
      name: desig.name,
      department: desig.department || '',
      description: desig.description || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingDesig(null);
    setFormData({ name: '', department: '', description: '' });
  };

  if (!user || !hasRole(["admin", "hr"])) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-blue-600" />
            Designations
          </h1>
          <p className="text-gray-500">Manage job designations linked to departments.</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Designation
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Designations</CardTitle>
          <CardDescription>These designations will appear in employee onboarding dropdown.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : designations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Briefcase className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No designations found. Create one to use in employee onboarding.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Description</TableHead>
                  {canManage && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {designations.map((desig) => (
                  <TableRow key={desig._id}>
                    <TableCell className="font-medium">{desig.name}</TableCell>
                    <TableCell>
                      {desig.department ? (
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {desig.department}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500">{desig.description || '-'}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(desig)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(desig._id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingDesig ? "Edit Designation" : "Add Designation"}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Software Engineer, Manager"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Department (Optional)</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingDesig ? "Update" : "Create")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
