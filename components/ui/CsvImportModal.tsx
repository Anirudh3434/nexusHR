"use client";

import React, { useState, useRef } from "react";
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  X, 
  Loader2, 
  ArrowRight,
  FileText
} from "lucide-react";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { ModalPortal } from "./ModalPortal";
import { parseCSV, downloadCSV } from "@/lib/csvUtils";

export interface CsvPreviewColumn<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
}

export interface CsvImportModalProps<T extends { isValid: boolean; error?: string; rowNumber: number }> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  sampleFileName: string;
  sampleContent: string;
  columns: CsvPreviewColumn<T>[];
  rowParser: (rawRows: string[][]) => T[];
  onImport: (validRows: T[]) => Promise<{
    importedCount: number;
    skippedCount: number;
    errors?: Array<{ row?: number; name?: string; email?: string; reason?: string }>;
  }>;
  onSuccess: () => void;
}

export function CsvImportModal<T extends { isValid: boolean; error?: string; rowNumber: number }>({
  isOpen,
  onClose,
  title,
  description,
  sampleFileName,
  sampleContent,
  columns,
  rowParser,
  onImport,
  onSuccess,
}: CsvImportModalProps<T>) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<T[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    importedCount: number;
    skippedCount: number;
    errors?: Array<{ row?: number; name?: string; email?: string; reason?: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a valid .csv file.");
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setResultSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rawGrid = parseCSV(text);
        const parsed = rowParser(rawGrid);
        setParsedRows(parsed);
      } catch (err) {
        console.error("CSV parse error:", err);
        alert("Failed to read CSV. Please verify file formatting.");
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setResultSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleExecuteImport = async () => {
    if (validRows.length === 0) return;
    setIsSubmitting(true);
    try {
      const summary = await onImport(validRows);
      setResultSummary(summary);
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Bulk import failed. Please check your data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetState();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Sample template banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Need the correct column format?</p>
                <p className="text-xs text-muted-foreground">Download our pre-formatted sample template with headers and examples.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCSV(sampleFileName, sampleContent)}
              className="bg-card text-primary border-primary/30 hover:bg-primary/5 shrink-0"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download Sample CSV
            </Button>
          </div>

          {/* Result Summary State */}
          {resultSummary ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100 flex items-start gap-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">Import Completed</h3>
                  <p className="text-sm text-emerald-800 dark:text-emerald-300">
                    Successfully imported <span className="font-bold">{resultSummary.importedCount}</span> record(s).
                    {resultSummary.skippedCount > 0 && ` Skipped ${resultSummary.skippedCount} record(s).`}
                  </p>
                </div>
              </div>

              {resultSummary.errors && resultSummary.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Warnings & Skipped Rows ({resultSummary.errors.length})
                  </h4>
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 text-xs">
                    {resultSummary.errors.map((err, i) => (
                      <div key={i} className="p-2.5 flex items-start gap-2 text-slate-700 dark:text-slate-300">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          {err.row && <span className="font-semibold text-slate-900 dark:text-slate-100">Row {err.row}: </span>}
                          {err.name && <span className="font-medium text-slate-800 dark:text-slate-200">[{err.name}] </span>}
                          {err.email && <span className="font-mono text-slate-600 dark:text-slate-400">&lt;{err.email}&gt; </span>}
                          <span className="text-slate-600 dark:text-slate-400">{err.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : !file ? (
            /* Upload Zone */
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? "border-primary bg-primary/10 scale-[0.99]"
                  : "border-slate-300 dark:border-slate-700 hover:border-primary/60 bg-slate-50/30 dark:bg-slate-800/20"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <Upload className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Click to upload or drag & drop your CSV file here
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Accepts standard comma-separated .csv files
                  </p>
                </div>
              </div>
            </div>
          ) : isParsing ? (
            /* Parsing State */
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm">Parsing and validating CSV data...</p>
            </div>
          ) : (
            /* Preview State */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{file.name}</span>
                  <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{parsedRows.length} Total Rows</Badge>
                  <Badge variant="default" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300">
                    {validRows.length} Valid
                  </Badge>
                  {invalidRows.length > 0 && (
                    <Badge variant="destructive">
                      {invalidRows.length} Invalid
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={resetState} className="text-slate-500 hover:text-slate-700 h-6 px-2 text-xs">
                    Choose Another File
                  </Button>
                </div>
              </div>

              {/* Rows Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5 w-12 text-center">#</th>
                      <th className="p-2.5 w-24">Status</th>
                      {columns.map((col, idx) => (
                        <th key={idx} className="p-2.5 whitespace-nowrap">{col.header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {parsedRows.map((row, i) => (
                      <tr 
                        key={i} 
                        className={row.isValid ? "hover:bg-slate-50/50 dark:hover:bg-slate-800/30" : "bg-red-50/30 dark:bg-red-950/20 hover:bg-red-50/50"}
                      >
                        <td className="p-2.5 text-center text-slate-400 font-mono">{row.rowNumber}</td>
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium" title={row.error}>
                              <AlertCircle className="h-3.5 w-3.5" />
                              Error
                            </span>
                          )}
                        </td>
                        {columns.map((col, cIdx) => (
                          <td key={cIdx} className="p-2.5 whitespace-nowrap max-w-[200px] truncate">
                            {col.accessor(row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidRows.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{invalidRows.length} row(s) contain validation errors</span> and will be skipped during import. You can proceed to import the {validRows.length} valid row(s), or update your CSV and re-upload.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button
            variant="ghost"
            onClick={() => {
              resetState();
              onClose();
            }}
            disabled={isSubmitting}
          >
            {resultSummary ? "Close" : "Cancel"}
          </Button>

          {resultSummary ? (
            <Button
              onClick={() => {
                resetState();
                onClose();
              }}
            >
              Done
            </Button>
          ) : file && !isParsing ? (
            <Button
              onClick={handleExecuteImport}
              disabled={validRows.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Import {validRows.length} Record{validRows.length !== 1 ? 's' : ''}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
      </div>
    </ModalPortal>
  );
}
