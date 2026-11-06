"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getDesignations, createDesignation, updateDesignation, deleteDesignation, bulkImportDesignations, Designation } from "../../../services/designationService";
import { getDepartments, Department } from "../../../services/departmentService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Briefcase, Plus, Pencil, Trash2, Loader2, X, Upload, Building2 } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { PageHeader } from "../../../components/ui/PageHeader";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { CsvImportModal } from "../../../components/ui/CsvImportModal";
import { DESIGNATION_CSV_TEMPLATE, parseDesignationCSV, ParsedDesignationRow } from "../../../lib/csvUtils";

export default function DesignationsPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  const [formData, setFormData] = useState({ name: '', department: '', description: '' });

  const canManage = hasRole(["admin", "hr"]);

  useEffect(() => {
    if (user?.companyId) fetchData();
  }, [user?.companyId]);

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
      <PageHeader
        icon={<Briefcase />}
        title="Designations"
        description="Manage job designations linked to departments."
        actions={
          canManage && (
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto text-xs sm:text-sm px-3" onClick={() => setShowImportModal(true)}>
                <Upload className="mr-1.5 sm:mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button className="w-full sm:w-auto text-xs sm:text-sm px-3" onClick={() => setShowModal(true)}>
                <Plus className="mr-1.5 sm:mr-2 h-4 w-4" />
                Add Designation
              </Button>
            </div>
          )
        }
      />

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>All Designations</CardTitle>
          <CardDescription>These designations will appear in employee onboarding dropdown.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : designations.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={18} />}
              title="No designations found."
              description="Create one to use in employee onboarding."
            />
          ) : (
            <>
              {/* Mobile Card View (< md) */}
              <div className="space-y-3 md:hidden">
                {designations.map((desig) => (
                  <div
                    key={desig._id}
                    className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-xs transition-colors hover:border-border/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Briefcase className="h-4 w-4" />
                          </div>
                          <h4 className="font-semibold text-foreground text-base truncate">
                            {desig.name}
                          </h4>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditModal(desig)}
                            aria-label={`Edit ${desig.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400"
                            onClick={() => handleDelete(desig._id)}
                            aria-label={`Delete ${desig.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {desig.description ? (
                      <p className="text-sm text-muted-foreground leading-relaxed break-words">
                        {desig.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">
                        No description provided
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border/40">
                      {desig.department ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                          <Building2 className="h-3 w-3" />
                          <span>{desig.department}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">No department</span>
                      )}
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
                      <TableHead className="min-w-[180px]">Designation</TableHead>
                      <TableHead className="min-w-[160px]">Department</TableHead>
                      <TableHead className="min-w-[260px]">Description</TableHead>
                      {canManage && <TableHead className="w-24 text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {designations.map((desig) => (
                      <TableRow key={desig._id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-primary shrink-0" />
                            <span>{desig.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {desig.department ? (
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded dark:bg-blue-500/15 dark:text-blue-300">
                              {desig.department}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-md break-words">
                          {desig.description || '—'}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(desig)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(desig._id)} className="text-red-600 hover:text-red-700 dark:text-red-400">
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
                  {editingDesig ? "Edit Designation" : "Add Designation"}
                </h2>
                <button onClick={resetForm} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Designation Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Software Engineer, Manager"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
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
        </ModalPortal>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal<ParsedDesignationRow>
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Designations from CSV"
        description="Bulk upload designations linked to company departments."
        sampleFileName="designations_sample_template.csv"
        sampleContent={DESIGNATION_CSV_TEMPLATE}
        rowParser={parseDesignationCSV}
        columns={[
          {
            header: "Designation Name",
            accessor: (row) => (
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {row.name || <span className="text-red-500 italic">Missing name</span>}
              </span>
            ),
          },
          {
            header: "Department",
            accessor: (row) => (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {row.department || "General / Unassigned"}
              </span>
            ),
          },
          {
            header: "Description",
            accessor: (row) => <span className="text-slate-500">{row.description || "—"}</span>,
          },
        ]}
        onImport={async (validRows) => {
          const res = await bulkImportDesignations(
            validRows.map((r) => ({
              name: r.name,
              department: r.department,
              description: r.description,
            })),
            user?.companyId
          );
          addToast({
            type: "success",
            title: "Import Successful",
            description: `${res.importedCount} designations imported successfully${res.skippedCount > 0 ? `, ${res.skippedCount} skipped` : ""}.`,
          });
          return res;
        }}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}

