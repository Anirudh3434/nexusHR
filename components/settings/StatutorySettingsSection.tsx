"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  ShieldCheck, 
  Calculator, 
  AlertTriangle, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  FileText,
  TrendingUp,
  X
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

interface StatutorySettingsSectionProps {
  companyId: string;
}

export function StatutorySettingsSection({ companyId }: StatutorySettingsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [config, setConfig] = useState({
    pf: {
      enabled: true,
      establishmentCode: "",
      wageCeilingMode: "statutory_ceiling",
      componentsIncluded: ["basic", "da"],
      employerShareInCtc: true,
      epsEdliBasis: "statutory_ceiling",
      newJoinerAboveCeiling: "allow_opt_out",
    },
    esi: {
      enabled: true,
      establishmentCode: "",
      threshold: 21000,
      componentsIncluded: ["basic", "hra", "da", "specialAllowance", "conveyance", "medical"],
      enforceContributionPeriod: true,
    },
    pt: {
      enabled: true,
      stateRegistrations: [
        { state: "Maharashtra", registrationNumber: "", ptoCircle: "" },
      ],
    },
    tax: {
      tanNumber: "",
      defaultRegime: "new",
    },
    general: {
      roundingMode: "round",
    },
  });

  const [resolvedRules, setResolvedRules] = useState<any>(null);

  useEffect(() => {
    if (companyId) {
      loadSettings();
    }
  }, [companyId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch(`/api/company/statutory-settings?companyId=${companyId}`);
      if (!res.ok) throw new Error("Failed to load statutory configuration");
      const data = await res.json();
      if (data.statutoryConfig && Object.keys(data.statutoryConfig).length > 0) {
        setConfig((prev) => ({
          ...prev,
          ...data.statutoryConfig,
          pf: { ...prev.pf, ...(data.statutoryConfig.pf || {}) },
          esi: { ...prev.esi, ...(data.statutoryConfig.esi || {}) },
          pt: { ...prev.pt, ...(data.statutoryConfig.pt || {}) },
          tax: { ...prev.tax, ...(data.statutoryConfig.tax || {}) },
          general: { ...prev.general, ...(data.statutoryConfig.general || {}) },
        }));
      }
      setResolvedRules(data.resolvedRules);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPtState = () => {
    setConfig((prev) => ({
      ...prev,
      pt: {
        ...prev.pt,
        stateRegistrations: [
          ...prev.pt.stateRegistrations,
          { state: "", registrationNumber: "", ptoCircle: "" },
        ],
      },
    }));
  };

  const handleRemovePtState = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      pt: {
        ...prev.pt,
        stateRegistrations: prev.pt.stateRegistrations.filter((_, i) => i !== index),
      },
    }));
  };

  const handlePreviewImpact = async () => {
    try {
      setSimulating(true);
      setErrorMessage(null);
      const res = await fetch("/api/company/statutory-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, statutoryConfig: config }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.errors?.join(", ") || data.message || "Simulation failed");
      }
      setSimulationData(data.simulation);
      setPreviewModalOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Simulation error");
    } finally {
      setSimulating(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      const res = await fetch("/api/company/statutory-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, statutoryConfig: config }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.errors?.join(", ") || data.message || "Save failed");
      }
      setSuccessMessage("Statutory configuration saved and audited successfully.");
      setPreviewModalOpen(false);
      setResolvedRules(data.resolvedRules);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading statutory rules & compliance configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Resolved Active Statutory Summary Banner */}
      {resolvedRules && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center">
              <ShieldCheck className="w-4 h-4 text-emerald-500 mr-2" />
              Active Statutory Resolution (Date-Effective)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Current PF Ceiling: <strong>₹{resolvedRules.pf.ceiling.toLocaleString()}</strong> (S.O. 5109(E)) | ESI Threshold: <strong>₹{resolvedRules.esi.threshold.toLocaleString()}</strong> | Tax Law: <strong>Income-tax Act, {resolvedRules.tax.act}</strong>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadSettings}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh Rules
          </Button>
        </div>
      )}

      {/* EPF / EPS Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-indigo-600" />
            Employees' Provident Fund (EPFO) Settings
          </CardTitle>
          <CardDescription>
            Governed by EPF Scheme, 2026 and Gazette Notification S.O. 5109(E).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                PF Establishment Code
              </label>
              <input
                type="text"
                placeholder="e.g. MH/BAN/0012345/000"
                value={config.pf.establishmentCode}
                onChange={(e) =>
                  setConfig({ ...config, pf: { ...config.pf, establishmentCode: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                PF Wage Ceiling Rule
              </label>
              <select
                value={config.pf.wageCeilingMode}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pf: { ...config.pf, wageCeilingMode: e.target.value as any },
                  })
                }
                className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="statutory_ceiling">
                  Restrict to Statutory Ceiling (₹25,000 / ₹15,000 prorated)
                </option>
                <option value="actual_wages">
                  Contribute on Actual Wages (Above Statutory Ceiling)
                </option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                Include Employer PF in CTC
              </span>
              <p className="text-xs text-gray-500">
                Employer's 12% contribution is deducted from overall CTC package.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.pf.employerShareInCtc}
              onChange={(e) =>
                setConfig({
                  ...config,
                  pf: { ...config.pf, employerShareInCtc: e.target.checked },
                })
              }
              className="w-4 h-4 text-indigo-600 rounded"
            />
          </div>
        </CardContent>
      </Card>

      {/* ESI Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600" />
            Employees' State Insurance (ESIC) Settings
          </CardTitle>
          <CardDescription>
            Governed by ESI Act & Notification G.S.R. 959(E) (0.75% employee, 3.25% employer).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                ESIC Establishment Code (17 digits)
              </label>
              <input
                type="text"
                placeholder="e.g. 11000123450000101"
                value={config.esi.establishmentCode}
                onChange={(e) =>
                  setConfig({ ...config, esi: { ...config.esi, establishmentCode: e.target.value } })
                }
                className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                ESI Wage Threshold (Min ₹21,000)
              </label>
              <input
                type="number"
                min={21000}
                value={config.esi.threshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    esi: { ...config.esi, threshold: Math.max(21000, Number(e.target.value)) },
                  })
                }
                className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                Enforce 6-Month Contribution Period Lock-in
              </span>
              <p className="text-xs text-gray-500">
                Employees exceeding ₹21,000 mid-period remain covered until period ends (Regulation 4).
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.esi.enforceContributionPeriod}
              onChange={(e) =>
                setConfig({
                  ...config,
                  esi: { ...config.esi, enforceContributionPeriod: e.target.checked },
                })
              }
              className="w-4 h-4 text-indigo-600 rounded"
            />
          </div>
        </CardContent>
      </Card>

      {/* Professional Tax Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center">
                <Calculator className="w-4 h-4 mr-2 text-amber-600" />
                Professional Tax (PT) State Registrations
              </CardTitle>
              <CardDescription>
                State-wise registration certificates & monthly slabs (including February adjustment).
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddPtState}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add State
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.pt.stateRegistrations.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input
                type="text"
                placeholder="State (e.g. Maharashtra, Karnataka)"
                value={item.state}
                onChange={(e) => {
                  const updated = [...config.pt.stateRegistrations];
                  updated[idx].state = e.target.value;
                  setConfig({ ...config, pt: { ...config.pt, stateRegistrations: updated } });
                }}
                className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
              <input
                type="text"
                placeholder="Registration / Certificate No."
                value={item.registrationNumber}
                onChange={(e) => {
                  const updated = [...config.pt.stateRegistrations];
                  updated[idx].registrationNumber = e.target.value;
                  setConfig({ ...config, pt: { ...config.pt, stateRegistrations: updated } });
                }}
                className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemovePtState(idx)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tax & General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <FileText className="w-4 h-4 mr-2 text-cyan-600" />
            TDS & General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                TAN (Tax Deduction Account Number)
              </label>
              <input
                type="text"
                placeholder="e.g. MUMB12345A"
                value={config.tax.tanNumber}
                onChange={(e) =>
                  setConfig({ ...config, tax: { ...config.tax, tanNumber: e.target.value.toUpperCase() } })
                }
                className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                Default Tax Regime
              </label>
              <select
                value={config.tax.defaultRegime}
                onChange={(e) =>
                  setConfig({ ...config, tax: { ...config.tax, defaultRegime: e.target.value as any } })
                }
                className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="new">New Tax Regime (Default per Act)</option>
                <option value="old">Old Tax Regime</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                Calculation Rounding Mode
              </label>
              <select
                value={config.general.roundingMode}
                onChange={(e) =>
                  setConfig({ ...config, general: { ...config.general, roundingMode: e.target.value as any } })
                }
                className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="round">Standard Math Round (to nearest ₹1)</option>
                <option value="floor">Floor (truncate decimals)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handlePreviewImpact}
          disabled={simulating || saving}
        >
          {simulating ? (
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <TrendingUp className="w-4 h-4 mr-2 text-indigo-600" />
          )}
          Preview Impact on Current Employees
        </Button>
        <Button onClick={handleSave} disabled={saving || simulating}>
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings & Create Audit Entry
        </Button>
      </div>

      {/* Preview Impact Modal */}
      {previewModalOpen && simulationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 flex items-center">
                <TrendingUp className="w-5 h-5 text-indigo-600 mr-2" />
                Statutory Configuration Impact Simulation
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-xs text-gray-500">Active Employees Evaluated</span>
                <p className="text-lg font-bold">{simulationData.employeeCount}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-xs text-gray-500">Employees with Changes</span>
                <p className="text-lg font-bold text-indigo-600">
                  {simulationData.affectedEmployees?.length || 0}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-xs text-gray-500">Net Take-Home Pay Difference</span>
                <p className={`text-base font-semibold ${simulationData.netPayDifference < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  ₹{simulationData.netPayDifference.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-xs text-gray-500">Employer Liability Difference</span>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  ₹{simulationData.employerLiabilityDifference.toLocaleString()}
                </p>
              </div>
            </div>

            {simulationData.affectedEmployees?.length > 0 ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Sample Affected Employees:
                </span>
                <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-xs">
                    <thead className="bg-gray-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Employee</th>
                        <th className="px-3 py-2 text-right font-medium">Basic</th>
                        <th className="px-3 py-2 text-right font-medium">Current PF</th>
                        <th className="px-3 py-2 text-right font-medium">Proposed PF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                      {simulationData.affectedEmployees.map((emp: any, i: number) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{emp.name}</td>
                          <td className="px-3 py-2 text-right">₹{emp.basicSalary.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">₹{emp.currentPf.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-semibold text-indigo-600">
                            ₹{emp.proposedPf.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                No active employee wage changes detected under proposed rules.
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button variant="outline" onClick={() => setPreviewModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Confirm & Save Configuration"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
