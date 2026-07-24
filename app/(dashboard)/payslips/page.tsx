"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  IndianRupee, 
  Calendar, 
  Download, 
  CheckCircle2, 
  Clock, 
  FileText,
  TrendingUp,
  TrendingDown,
  Printer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function PayslipsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchMyPayslips();
    }
  }, [user]);

  const fetchMyPayslips = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payroll?employeeId=${user?.id}`);
      const data = await res.json();
      setPayrolls(data);
    } catch (error) {
      addToast({ type: 'error', title: 'Error', description: 'Failed to load payslips' });
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month).toLocaleString('en-us', { month: 'long' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">My Payslips</h1>
        <p className="text-gray-500 dark:text-gray-400">View and download your monthly salary statements.</p>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Clock className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : payrolls.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p>No payslips have been generated for you yet.</p>
            </CardContent>
          </Card>
        ) : (
          payrolls.map((payroll) => (
            <Card key={payroll._id} className="overflow-hidden border-l-4 border-l-blue-600">
              <CardContent className="p-0">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400">
                      <span className="text-[10px] uppercase font-bold">{payroll.year}</span>
                      <span className="text-sm font-black italic">{getMonthName(payroll.month).slice(0, 3)}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Payslip for {getMonthName(payroll.month)} {payroll.year}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          payroll.status === 'Paid' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {payroll.status}
                        </span>
                        {payroll.paymentDate && (
                          <span className="text-[10px] text-gray-500 italic">
                            Paid on {new Date(payroll.paymentDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:text-right">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Earnings</p>
                      <div className="text-sm font-semibold flex items-center md:justify-end text-green-600">
                        <TrendingUp size={14} className="mr-1" />
                        ₹{(payroll.baseSalary + payroll.overtimePay).toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Deductions</p>
                      <div className="text-sm font-semibold flex items-center md:justify-end text-red-600">
                        <TrendingDown size={14} className="mr-1" />
                        ₹{(payroll.lateDeduction + payroll.leaveDeduction).toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-1 col-span-2 md:col-span-1">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Net Amount</p>
                      <div className="text-xl font-black text-blue-600 flex items-center md:justify-end">
                        <IndianRupee size={18} className="mr-1" />
                        {payroll.netSalary.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2 h-9">
                      <Download size={14} /> Download
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Printer size={14} />
                    </Button>
                  </div>
                </div>
                
                {/* Expandable details area could go here */}
                <div className="bg-gray-50/50 dark:bg-gray-900/20 px-6 py-3 border-t flex flex-wrap gap-4 text-[10px] text-gray-500 tracking-tight">
                  <div className="flex items-center gap-1">
                    <Clock size={12} /> Overtime: {payroll.overtimeHours} hrs (₹{payroll.overtimePay})
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingDown size={12} /> Late arrivals: {payroll.totalLateMinutes} mins
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} /> Unpaid Leaves: {payroll.unpaidLeaves} days
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
