"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  Plus, Receipt, Calendar, DollarSign, FileText, 
  CheckCircle, Clock, XCircle, ChevronDown, ChevronUp,
  Upload, Briefcase, User, Building, Filter
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
  billable: boolean;
  createdAt: string;
  comments?: {
    authorName: string;
    role: string;
    message: string;
    createdAt: string;
  }[];
}

const categoryOptions = [
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'meals', label: 'Meals', icon: '🍽️' },
  { value: 'transportation', label: 'Transportation', icon: '🚗' },
  { value: 'accommodation', label: 'Accommodation', icon: '🏨' },
  { value: 'office_supplies', label: 'Office Supplies', icon: '📎' },
  { value: 'training', label: 'Training', icon: '📚' },
  { value: 'communication', label: 'Communication', icon: '📞' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎉' },
  { value: 'medical', label: 'Medical', icon: '💊' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const currencyOptions = [
  { value: 'INR', label: '₹ INR - Indian Rupee' },
  { value: 'USD', label: '$ USD - US Dollar' },
  { value: 'EUR', label: '€ EUR - Euro' },
  { value: 'GBP', label: '£ GBP - British Pound' },
  { value: 'AUD', label: 'A$ AUD - Australian Dollar' },
  { value: 'CAD', label: 'C$ CAD - Canadian Dollar' },
  { value: 'SGD', label: 'S$ SGD - Singapore Dollar' },
  { value: 'AED', label: 'د.إ AED - UAE Dirham' },
];

export default function MyExpensesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Form state
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [expenseDate, setExpenseDate] = useState("");
  const [vendor, setVendor] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [billable, setBillable] = useState(false);
  const [submitNow, setSubmitNow] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  
  // Comments
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchExpenses();
    }
  }, [user?.id, filterStatus, filterCategory, filterYear]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('employeeId', user?.id || '');
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);
      
      // Date filter by year
      if (filterYear) {
        params.append('fromDate', `${filterYear}-01-01`);
        params.append('toDate', `${filterYear}-12-31`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !description || !amount || !expenseDate) {
      addToast({ type: "error", title: "Error", description: "Please fill all required fields" });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description,
          amount: parseFloat(amount),
          currency,
          expenseDate,
          vendor,
          receiptUrl,
          projectName,
          billable,
          submitNow,
          companyId: user?.companyId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addToast({ type: "success", title: "Success", description: data.message });
        fetchExpenses();
        setShowForm(false);
        resetForm();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to create expense:", error);
      addToast({ type: "error", title: "Error", description: "Failed to create expense" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCategory("");
    setDescription("");
    setAmount("");
    setCurrency("INR");
    setExpenseDate("");
    setVendor("");
    setReceiptUrl("");
    setProjectName("");
    setBillable(false);
    setSubmitNow(false);
  };

  const handleSubmitDraft = async (id: string) => {
    try {
      const response = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'submitted' }),
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Expense submitted for approval" });
        fetchExpenses();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to submit expense:", error);
    }
  };

  const handleDelete = async (id: string, status: string) => {
    if (status !== 'draft') {
      addToast({ type: "error", title: "Error", description: "Can only delete draft expenses" });
      return;
    }
    
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({ type: "success", title: "Success", description: "Expense deleted" });
        fetchExpenses();
      } else {
        const error = await response.json();
        addToast({ type: "error", title: "Error", description: error.message });
      }
    } catch (error) {
      console.error("Failed to delete:", error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'submitted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'reimbursed': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryLabel = (value: string) => {
    return categoryOptions.find(c => c.value === value)?.label || value;
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

  // Calculate totals
  const totalSubmitted = expenses
    .filter(e => e.status !== 'draft')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const totalReimbursed = expenses
    .filter(e => e.status === 'reimbursed')
    .reduce((sum, e) => sum + e.amount, 0);

  const pendingAmount = expenses
    .filter(e => ['submitted', 'under_review', 'approved'].includes(e.status))
    .reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Expenses</h1>
          <p className="text-sm text-gray-500">Submit and track your expense claims</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1.5" />
          {showForm ? 'Cancel' : 'New Expense'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Submitted', value: formatCurrency(totalSubmitted, 'INR'), color: 'blue' },
          { label: 'Pending', value: formatCurrency(pendingAmount, 'INR'), color: 'yellow' },
          { label: 'Reimbursed', value: formatCurrency(totalReimbursed, 'INR'), color: 'purple' },
          { label: 'Drafts', value: expenses.filter(e => e.status === 'draft').length, color: 'gray', isCount: true },
        ].map(({ label, value, color, isCount }) => (
          <Card key={label} className="border-gray-200">
            <CardContent className="p-3">
              <p className={`text-lg font-semibold ${isCount ? 'text-gray-900' : `text-${color}-600`}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Add New Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-28 px-2 py-2 border border-gray-200 rounded-md text-sm bg-gray-50"
                    >
                      {currencyOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.value}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor/Store
                  </label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g., Uber, Marriott, Amazon"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the expense (e.g., Client dinner at restaurant, Flight to Mumbai for meeting)"
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{description.length}/500 characters</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., ABC Client Project"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={billable}
                      onChange={(e) => setBillable(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Billable to client</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt URL (Optional)
                </label>
                <div className="relative">
                  <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="https://cloudinary.com/receipt.jpg or upload link"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Paste receipt image URL or Cloudinary upload link</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={submitNow}
                    onChange={(e) => setSubmitNow(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Submit for approval immediately</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowForm(false); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : (submitNow ? 'Submit Expense' : 'Save as Draft')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="reimbursed">Reimbursed</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        {expenses.length === 0 ? (
          <Card className="border-gray-200">
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No expenses</h3>
              <p className="text-gray-500 text-sm">You haven't submitted any expenses yet</p>
            </CardContent>
          </Card>
        ) : (
          expenses.map((expense) => (
            <Card key={expense._id} className="border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                        {expense.expenseNumber}
                      </code>
                      <Badge className={`${getStatusColor(expense.status)} text-xs px-2 py-0.5`}>
                        {expense.status.replace('_', ' ')}
                      </Badge>
                      {expense.billable && (
                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                          Billable
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {getCategoryLabel(expense.category)}
                      </span>
                      <span className="text-lg font-semibold text-gray-900">
                        {formatCurrency(expense.amount, expense.currency)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-1">{expense.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(expense.expenseDate).toLocaleDateString('en-GB')}
                      </span>
                      {expense.vendor && (
                        <span className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5" />
                          {expense.vendor}
                        </span>
                      )}
                      {expense.projectName && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {expense.projectName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-start gap-1">
                    {expense.status === 'draft' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSubmitDraft(expense._id)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                          title="Submit for approval"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense._id, expense.status)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                          title="Delete"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    {expense.receiptUrl && (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        title="View receipt"
                      >
                        <FileText className="h-4 w-4" />
                      </a>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(expense._id)}
                      className="text-gray-500 h-8 px-2"
                    >
                      {expandedId === expense._id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === expense._id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Created:</span>{' '}
                        <span>{new Date(expense.createdAt).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Category:</span>{' '}
                        <span className="capitalize">{expense.category.replace('_', ' ')}</span>
                      </div>
                      {expense.billable && (
                        <div>
                          <span className="text-gray-500">Client Billable:</span>{' '}
                          <span className="text-blue-600">Yes</span>
                        </div>
                      )}
                    </div>

                    {/* Comments */}
                    {expense.comments && expense.comments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Comments</h4>
                        <div className="space-y-2">
                          {expense.comments.map((comment, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900">
                                  {comment.authorName}
                                  <span className="text-xs text-gray-500 ml-2">({comment.role})</span>
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(comment.createdAt).toLocaleDateString('en-GB')}
                                </span>
                              </div>
                              <p className="text-gray-600">{comment.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Comment */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Add Comment</h4>
                      <div className="flex gap-2">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a note or question..."
                          rows={2}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <Button
                          onClick={() => handleAddComment(expense._id)}
                          disabled={!newComment.trim()}
                          className="self-end"
                        >
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
