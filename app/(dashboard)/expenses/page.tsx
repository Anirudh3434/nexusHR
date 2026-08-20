"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  Receipt, DollarSign, CheckCircle, XCircle, Clock, 
  ChevronDown, ChevronUp, Calendar, User, Building, 
  Filter, Search, Download, Banknote, Loader2
} from "lucide-react";

interface ExpenseItem {
  _id: string;
  expenseNumber: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  status: string;
  receiptUrl?: string;
  vendor?: string;
  projectName?: string;
  clientName?: string;
  billable: boolean;
  createdAt: string;
  approvedAt?: string;
  reimbursedAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  rejectionReason?: string;
  
  employeeId: {
    _id: string;
    name: string;
    email: string;
    department: string;
    designation: string;
  };
  
  approvedBy?: { name: string };
  reimbursedBy?: { name: string };
  
  comments?: {
    authorName: string;
    role: string;
    message: string;
    createdAt: string;
  }[];
}

const categoryOptions = [
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'training', label: 'Training' },
  { value: 'communication', label: 'Communication' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

const categoryLabels: Record<string, string> = {
  travel: 'Travel',
  meals: 'Meals',
  transportation: 'Transportation',
  accommodation: 'Accommodation',
  office_supplies: 'Office Supplies',
  training: 'Training',
  communication: 'Communication',
  entertainment: 'Entertainment',
  medical: 'Medical',
  other: 'Other',
};

export default function ExpensesManagementPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterEmployee, setFilterEmployee] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Approval modal
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Reimbursement modal
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  
  // Comments
  const [newComment, setNewComment] = useState("");
  
  // Employees list for filter
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (user?.companyId) {
      fetchExpenses();
      fetchEmployees();
    }
  }, [user?.companyId, filterStatus, filterCategory, filterEmployee, filterMonth]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (user?.companyId) params.append('companyId', user.companyId);
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);
      if (filterEmployee) params.append('employeeId', filterEmployee);
      
      // Date filter by month
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        params.append('fromDate', `${filterMonth}-01`);
        params.append('toDate', `${filterMonth}-${lastDay}`);
      }
      
      const response = await fetch(`/api/expenses?${params.toString()}`);
      const data = await response.json();
      setExpenses(data.expenses || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      addToast({ type: "error", title: "Error", description: "Failed to load expenses" });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/employees?companyId=${user?.companyId}`);
      const data = await response.json();
      setEmployees(data || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Expense approved" });
        fetchExpenses();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleReject = async () => {
    if (!selectedExpense || !rejectionReason.trim()) return;

    try {
      const response = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedExpense._id, 
          status: 'rejected',
          rejectionReason 
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Expense rejected" });
        fetchExpenses();
        setSelectedExpense(null);
        setRejectionReason("");
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  const handleReimburse = async () => {
    if (!selectedExpense) return;

    try {
      const response = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedExpense._id, 
          status: 'reimbursed',
          paymentMethod,
          paymentReference
        }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Expense marked as reimbursed" });
        fetchExpenses();
        setSelectedExpense(null);
        setPaymentReference("");
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to reimburse:", error);
    }
  };

  const handleAddComment = async (expenseId: string) => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: expenseId,
          comment: newComment,
        }),
      });

      if (response.ok) {
        setNewComment("");
        fetchExpenses();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const exportCSV = () => {
    const headers = ['Expense ID', 'Employee', 'Category', 'Amount', 'Currency', 'Date', 'Description', 'Status', 'Billable'];
    const rows = expenses.map(e => [
      e.expenseNumber,
      e.employeeId.name,
      categoryLabels[e.category] || e.category,
      e.amount,
      e.currency,
      new Date(e.expenseDate).toLocaleDateString('en-GB'),
      e.description,
      e.status,
      e.billable ? 'Yes' : 'No'
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${filterMonth}.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      case 'submitted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'reimbursed': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatCurrency = (amount: number, curr: string) => {
    const symbols: Record<string, string> = {
      INR: '₹', USD: '$', EUR: '€', GBP: '£',
      AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ'
    };
    return `${symbols[curr] || curr} ${amount.toLocaleString()}`;
  };

  const filteredExpenses = expenses.filter(e => {
    const searchLower = searchQuery.toLowerCase();
    return (
      e.expenseNumber.toLowerCase().includes(searchLower) ||
      e.employeeId?.name?.toLowerCase().includes(searchLower) ||
      e.description.toLowerCase().includes(searchLower) ||
      categoryLabels[e.category]?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Expense Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Review, approve, and reimburse employee expenses</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Submitted', value: formatCurrency(stats.totalAmount || 0, 'INR'), color: 'blue' },
          { label: 'Pending Approval', value: formatCurrency(stats.pendingAmount || 0, 'INR'), color: 'yellow' },
          { label: 'Approved', value: formatCurrency(stats.approvedAmount || 0, 'INR'), color: 'green' },
          { label: 'Reimbursed', value: formatCurrency(stats.reimbursedAmount || 0, 'INR'), color: 'purple' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-3">
              <p className={`text-lg font-semibold text-${color}-600`}>{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by ID, employee, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-slate-900"
        >
          <option value="2026-04">April 2026</option>
          <option value="2026-03">March 2026</option>
          <option value="2026-02">February 2026</option>
          <option value="2026-01">January 2026</option>
          <option value="2025-12">December 2025</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-slate-900"
        >
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="reimbursed">Reimbursed</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-slate-900"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-slate-900"
        >
          <option value="">All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Expense ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Receipt className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">No expenses found</p>
                    <p className="text-sm">No expense claims match your filters</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <React.Fragment key={expense._id}>
                    <tr className="hover:bg-gray-50 dark:bg-slate-950">
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded font-mono">
                          {expense.expenseNumber}
                        </code>
                        {expense.billable && (
                          <Badge variant="outline" className="ml-2 text-xs text-blue-600 border-blue-200">
                            Billable
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{expense.employeeId.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{expense.employeeId.department}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize">{categoryLabels[expense.category] || expense.category}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(expense.amount, expense.currency)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {new Date(expense.expenseDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${getStatusColor(expense.status)} text-xs`}>
                          {expense.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {['submitted', 'under_review'].includes(expense.status) && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(expense._id)}
                                className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedExpense(expense)}
                                className="border-red-200 text-red-600 hover:bg-red-50 h-7 px-2 text-xs"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {expense.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedExpense(expense)}
                              className="bg-purple-600 hover:bg-purple-700 text-white h-7 px-2 text-xs"
                            >
                              <Banknote className="h-3.5 w-3.5 mr-1" />
                              Reimburse
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(expense._id)}
                            className="h-7 px-2"
                          >
                            {expandedId === expense._id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {/* Accordion Row */}
                    {expandedId === expense._id && (
                      <tr className="bg-gray-50 dark:bg-slate-950">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Description */}
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</p>
                              <p className="text-sm text-gray-900 dark:text-gray-100">{expense.description}</p>
                            </div>
                            
                            {/* Vendor */}
                            {expense.vendor && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vendor</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{expense.vendor}</p>
                              </div>
                            )}
                            
                            {/* Project */}
                            {expense.projectName && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Project</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{expense.projectName}</p>
                              </div>
                            )}
                            
                            {/* Client */}
                            {expense.clientName && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Client</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{expense.clientName}</p>
                              </div>
                            )}
                            
                            {/* Payment Method */}
                            {expense.paymentMethod && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment Method</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100 capitalize">{expense.paymentMethod.replace('_', ' ')}</p>
                              </div>
                            )}
                            
                            {/* Payment Reference */}
                            {expense.paymentReference && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment Reference</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{expense.paymentReference}</p>
                              </div>
                            )}
                            
                            {/* Receipt */}
                            {expense.receiptUrl && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Receipt</p>
                                <a 
                                  href={expense.receiptUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                                >
                                  View Receipt
                                </a>
                              </div>
                            )}
                            
                            {/* Rejection Reason */}
                            {expense.rejectionReason && (
                              <div className="space-y-1 md:col-span-2 lg:col-span-3">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rejection Reason</p>
                                <p className="text-sm text-red-600">{expense.rejectionReason}</p>
                              </div>
                            )}
                            
                            {/* Approval Info */}
                            {expense.approvedAt && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Approved By</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{expense.approvedBy?.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(expense.approvedAt).toLocaleString()}</p>
                              </div>
                            )}
                            
                            {/* Reimbursement Info */}
                            {expense.reimbursedAt && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reimbursed By</p>
                                <p className="text-sm text-gray-900 dark:text-gray-100">{expense.reimbursedBy?.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(expense.reimbursedAt).toLocaleString()}</p>
                              </div>
                            )}
                            
                            {/* Comments Section */}
                            {expense.comments && expense.comments.length > 0 && (
                              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Comments</p>
                                <div className="space-y-2">
                                  {expense.comments.map((comment: any, idx: number) => (
                                    <div key={idx} className="bg-white dark:bg-slate-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{comment.authorName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.createdAt).toLocaleString()}</p>
                                      </div>
                                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comment.message}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Add Comment */}
                            <div className="space-y-2 md:col-span-2 lg:col-span-3">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Add Comment</p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  placeholder="Type a comment..."
                                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleAddComment(expense._id)}
                                  disabled={!newComment.trim()}
                                  className="h-9"
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reject Modal */}
      {selectedExpense && selectedExpense.status !== 'approved' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Reject Expense {selectedExpense.expenseNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>{selectedExpense.employeeId.name}</strong> - {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                </p>
                <p className="text-sm text-red-600 mt-1">{selectedExpense.description}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this expense is being rejected..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedExpense(null);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={!rejectionReason.trim()}
                  onClick={handleReject}
                >
                  Reject Expense
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reimburse Modal */}
      {selectedExpense && selectedExpense.status === 'approved' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Reimburse Expense {selectedExpense.expenseNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>{selectedExpense.employeeId.name}</strong>
                </p>
                <p className="text-lg font-semibold text-purple-900">
                  {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                </p>
                <p className="text-sm text-purple-600">{selectedExpense.description}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., Transaction ID, Check Number"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedExpense(null);
                    setPaymentReference("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleReimburse}
                >
                  <Banknote className="h-4 w-4 mr-1" />
                  Mark Reimbursed
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
