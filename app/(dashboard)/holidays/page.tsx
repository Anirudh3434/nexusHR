"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getHolidays, createHoliday, deleteHoliday, Holiday } from "../../../services/holidayService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Loader2, Plus, X, Calendar, Trash2, Sun, Building2, Flag, Sparkles, Upload } from "lucide-react";

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function HolidaysPage() {
  const { user, hasRole } = useAuth();
  const { addToast } = useToast();
  
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'Company',
    description: '',
    isRecurring: false,
  });
  const [isImporting, setIsImporting] = useState(false);

  const canManage = hasRole(["admin", "hr"]);

  useEffect(() => {
    if (user?.companyId) {
      fetchHolidays();
    }
  }, [user, currentYear]);

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const data = await getHolidays({ 
        companyId: user!.companyId!, 
        year: currentYear.toString() 
      });
      setHolidays(data);
    } catch (error) {
      console.error("Failed to fetch holidays:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;

    setIsSubmitting(true);
    try {
      await createHoliday({
        companyId: user.companyId,
        name: formData.name,
        date: formData.date,
        type: formData.type,
        description: formData.description,
        isRecurring: formData.isRecurring,
        createdBy: user.id,
      });
      
      addToast({ type: 'success', title: 'Success', description: 'Holiday added successfully' });
      setShowModal(false);
      setFormData({ name: '', date: '', type: 'Company', description: '', isRecurring: false });
      fetchHolidays();
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to add holiday' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this holiday?')) return;
    
    setIsDeleting(id);
    try {
      await deleteHoliday(id);
      addToast({ type: 'success', title: 'Success', description: 'Holiday removed' });
      fetchHolidays();
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to remove holiday' });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      addToast({ type: 'error', title: 'Error', description: 'Please upload a CSV file' });
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.split('\n').filter(line => line.trim());
        
        // Skip header if present
        const startIndex = lines[0].toLowerCase().includes('date') || 
                          lines[0].toLowerCase().includes('name') ? 1 : 0;
        
        let successCount = 0;
        let errorCount = 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Parse CSV: date, name, type, description (optional)
          const columns = line.split(',').map(col => col.trim());
          
          if (columns.length < 2) {
            errorCount++;
            continue;
          }

          const [dateStr, name, type = 'Company', description = ''] = columns;

          // Validate date
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            errorCount++;
            continue;
          }

          try {
            await createHoliday({
              companyId: user!.companyId!,
              name: name.replace(/"/g, ''),
              date: date.toISOString().split('T')[0],
              type: ['National', 'Company', 'Optional', 'Weekend'].includes(type) ? type : 'Company',
              description: description.replace(/"/g, ''),
              createdBy: user!.id,
            });
            successCount++;
          } catch {
            errorCount++;
          }
        }

        if (successCount > 0) {
          addToast({ 
            type: 'success', 
            title: 'Import Complete', 
            description: `${successCount} holidays imported successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}` 
          });
          fetchHolidays();
        } else {
          addToast({ type: 'error', title: 'Import Failed', description: 'No holidays could be imported. Check CSV format.' });
        }
      } catch (error) {
        addToast({ type: 'error', title: 'Error', description: 'Failed to parse CSV file' });
      } finally {
        setIsImporting(false);
        // Reset file input
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      addToast({ type: 'error', title: 'Error', description: 'Failed to read file' });
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'National': return <Flag className="h-4 w-4 text-red-600" />;
      case 'Company': return <Building2 className="h-4 w-4 text-blue-600" />;
      case 'Optional': return <Sparkles className="h-4 w-4 text-purple-600" />;
      case 'Weekend': return <Sun className="h-4 w-4 text-yellow-600" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'National': return 'bg-red-50 text-red-700 border-red-200';
      case 'Company': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Optional': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Weekend': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-50 dark:bg-slate-950 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const groupByMonth = () => {
    const grouped: { [key: string]: Holiday[] } = {};
    MONTHS.forEach(m => grouped[m] = []);
    
    holidays.forEach(holiday => {
      const month = MONTHS[new Date(holiday.date).getMonth()];
      if (grouped[month]) {
        grouped[month].push(holiday);
      }
    });
    
    return grouped;
  };

  const groupedHolidays = groupByMonth();
  const totalHolidays = holidays.length;
  const nationalHolidays = holidays.filter(h => h.type === 'National').length;
  const companyHolidays = holidays.filter(h => h.type === 'Company').length;

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            Holiday Calendar
          </h1>
          <p className="text-gray-500 dark:text-gray-400">View company holidays and plan your year</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          {canManage && (
            <>
              <Button variant="outline" onClick={() => document.getElementById('csvInput')?.click()} disabled={isImporting}>
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import CSV'}
              </Button>
              <input
                id="csvInput"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVImport}
              />
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalHolidays}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Holidays</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{nationalHolidays}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">National Holidays</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{companyHolidays}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Company Holidays</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-700"><Flag className="h-3 w-3" /> National</span>
        <span className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700"><Building2 className="h-3 w-3" /> Company</span>
        <span className="flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-700"><Sparkles className="h-3 w-3" /> Optional</span>
        <span className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-50 text-yellow-700"><Sun className="h-3 w-3" /> Weekend</span>
      </div>

      {/* Holidays List by Month */}
      <Card>
        <CardHeader>
          <CardTitle>Holidays {currentYear}</CardTitle>
          <CardDescription>Complete list of holidays for the year</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          ) : totalHolidays === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No holidays found for {currentYear}</p>
              {canManage && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "Add Holiday" to create one</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {MONTHS.map(month => {
                const monthHolidays = groupedHolidays[month];
                if (monthHolidays.length === 0) return null;
                
                return (
                  <div key={month}>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3 sticky top-0 bg-white dark:bg-slate-900 py-2 border-b">
                      {month} {currentYear}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {monthHolidays.map(holiday => {
                        const date = new Date(holiday.date);
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                        const dayNum = date.getDate();
                        
                        return (
                          <div key={holiday.id} className={`border rounded-lg p-3 ${getTypeColor(holiday.type)}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className="text-center min-w-[40px]">
                                  <div className="text-lg font-bold">{dayNum}</div>
                                  <div className="text-xs uppercase">{dayName.slice(0, 3)}</div>
                                </div>
                                <div>
                                  <div className="flex items-center gap-1">
                                    {getTypeIcon(holiday.type)}
                                    <span className="font-medium">{holiday.name}</span>
                                  </div>
                                  {holiday.description && (
                                    <p className="text-xs opacity-80 mt-0.5">{holiday.description}</p>
                                  )}
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-white dark:bg-slate-900/50 mt-1 inline-block">
                                    {holiday.type}
                                  </span>
                                </div>
                              </div>
                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 hover:opacity-100 group-hover:opacity-100"
                                  onClick={() => handleDelete(holiday.id)}
                                  disabled={isDeleting === holiday.id}
                                >
                                  {isDeleting === holiday.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Holiday Modal */}
      {showModal && canManage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add Holiday</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Holiday Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Republic Day"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="National">National</option>
                    <option value="Company">Company</option>
                    <option value="Optional">Optional</option>
                    <option value="Weekend">Weekend</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional description..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="recurring" className="text-sm text-gray-700 dark:text-gray-300">Recurring yearly</label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Holiday'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
