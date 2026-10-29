"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, bulkImportDepartments, Department } from "../../../services/departmentService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Building2, Plus, Pencil, Trash2, Loader2, X, Upload } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { CsvImportModal } from "../../../components/ui/CsvImportModal";
import { DEPARTMENT_CSV_TEMPLATE, parseDepartmentCSV, ParsedDepartmentRow } from "../../../lib/csvUtils";

export default function DepartmentsPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const canManage = hasRole(["admin", "hr"]);

  useEffect(() => {
    if (user?.companyId) fetchDepartments();
  }, [user?.companyId]);

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const data = await getDepartments(user!.companyId!);
      setDepartments(data);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      addToast({ type: "error", title: "Error", description: "Failed to fetch departments" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;
    
    setIsSubmitting(true);
    try {
      if (editingDept) {
        await updateDepartment(editingDept._id, formData);
        addToast({ type: "success", title: "Success", description: "Department updated" });
      } else {
        await createDepartment({ ...formData, companyId: user.companyId });
        addToast({ type: "success", title: "Success", description: "Department created" });
      }
      resetForm();
      fetchDepartments();
    } catch (error) {
      console.error("Failed to save department:", error);
      addToast({ type: "error", title: "Error", description: "Failed to save department" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    
    try {
      await deleteDepartment(id);
      addToast({ type: "success", title: "Success", description: "Department deleted" });
      fetchDepartments();
    } catch (error) {
      addToast({ type: "error", title: "Error", description: "Failed to delete department" });
    }
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, description: dept.description || '' });
    setShowModal(true);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingDept(null);
    setFormData({ name: '', description: '' });
  };

  if (!user || !hasRole(["admin", "hr"])) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        icon={<Building2 />}
        title="Departments"
        description="Manage organization departments for employee onboarding."
        actions={
          canManage && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowImportModal(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Departments</CardTitle>
          <CardDescription>These departments will appear in employee onboarding dropdown.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : departments.length === 0 ? (
            <EmptyState
              icon={<Building2 size={18} />}
              title="No departments found."
              description="Create one to use in employee onboarding."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  {canManage && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept._id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400">{dept.description || '-'}</TableCell>
                    <TableCell className="text-gray-400 dark:text-gray-500 text-sm">
                      {new Date(dept.createdAt).toLocaleDateString()}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(dept)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(dept._id)} className="text-red-600 hover:text-red-700 dark:text-red-400">
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
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">
                  {editingDept ? "Edit Department" : "Add Department"}
                </h2>
                <button onClick={resetForm} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Engineering, Sales, HR"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={resetForm} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingDept ? "Update" : "Create")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal<ParsedDepartmentRow>
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Departments from CSV"
        description="Bulk upload departments with names and descriptions."
        sampleFileName="departments_sample_template.csv"
        sampleContent={DEPARTMENT_CSV_TEMPLATE}
        rowParser={parseDepartmentCSV}
        columns={[
          {
            header: "Department Name",
            accessor: (row) => (
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {row.name || <span className="text-red-500 italic">Missing name</span>}
              </span>
            ),
          },
          {
            header: "Description",
            accessor: (row) => <span className="text-slate-500">{row.description || "—"}</span>,
          },
        ]}
        onImport={async (validRows) => {
          const res = await bulkImportDepartments(
            validRows.map((r) => ({ name: r.name, description: r.description })),
            user?.companyId
          );
          addToast({
            type: "success",
            title: "Import Successful",
            description: `${res.importedCount} departments imported successfully${res.skippedCount > 0 ? `, ${res.skippedCount} skipped` : ""}.`,
          });
          return res;
        }}
        onSuccess={() => fetchDepartments()}
      />
    </div>
  );
}


