"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, bulkImportDepartments, Department } from "../../../services/departmentService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Building2, Plus, Pencil, Trash2, Loader2, X, Upload, Calendar } from "lucide-react";
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto text-xs sm:text-sm px-3" onClick={() => setShowImportModal(true)}>
                <Upload className="mr-1.5 sm:mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button className="w-full sm:w-auto text-xs sm:text-sm px-3" onClick={() => setShowModal(true)}>
                <Plus className="mr-1.5 sm:mr-2 h-4 w-4" />
                Add Department
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>All Departments</CardTitle>
          <CardDescription>These departments will appear in employee onboarding dropdown.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
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
            <>
              {/* Mobile Card View (< md) */}
              <div className="space-y-3 md:hidden">
                {departments.map((dept) => (
                  <div
                    key={dept._id}
                    className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-xs transition-colors hover:border-border/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <h4 className="font-semibold text-foreground text-base truncate">
                            {dept.name}
                          </h4>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditModal(dept)}
                            aria-label={`Edit ${dept.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400"
                            onClick={() => handleDelete(dept._id)}
                            aria-label={`Delete ${dept.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {dept.description ? (
                      <p className="text-sm text-muted-foreground leading-relaxed break-words">
                        {dept.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">
                        No description provided
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border/40">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Created {formatDate(dept.createdAt)}</span>
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Department Name</TableHead>
                      <TableHead className="min-w-[260px]">Description</TableHead>
                      <TableHead className="min-w-[130px]">Created</TableHead>
                      {canManage && <TableHead className="w-24 text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept._id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary shrink-0" />
                            <span>{dept.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-md break-words">
                          {dept.description || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {formatDate(dept.createdAt)}
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
              </div>
            </>
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


