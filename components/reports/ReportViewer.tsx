"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Play, Download, RefreshCw, Calendar, FileText, 
  Loader2, CheckCircle, XCircle, Clock 
} from 'lucide-react';

interface ReportTemplate {
  _id: string;
  name: string;
  description: string;
  category: string;
  parameters: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
    defaultValue?: any;
  }>;
}

interface ReportExecution {
  _id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  executedAt: Date;
  completedAt?: Date;
  resultUrl?: string;
  resultFormat?: string;
  recordCount?: number;
  error?: string;
}

export default function ReportViewer({ template }: { template: ReportTemplate }) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [execution, setExecution] = useState<ReportExecution | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize parameters with default values
    const defaultParams: Record<string, any> = {};
    template.parameters.forEach(param => {
      if (param.defaultValue !== undefined) {
        defaultParams[param.key] = param.defaultValue;
      }
    });
    setParameters(defaultParams);

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [template]);

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (userData) {
        headers['x-company-id'] = userData.companyId || '';
        headers['x-user-id'] = userData.id || '';
      }

      const response = await fetch(`/api/reports/execute/${template._id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ parameters })
      });

      if (response.ok) {
        const data = await response.json();
        setExecution({ _id: data.executionId, status: 'processing', executedAt: new Date() });
        
        // Start polling for completion
        startPolling(data.executionId);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error executing report:', error);
      alert('Failed to execute report');
    } finally {
      setIsExecuting(false);
    }
  };

  const startPolling = (executionId: string) => {
    const interval = setInterval(async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const userData = storedUser ? JSON.parse(storedUser) : null;

        const headers: Record<string, string> = {};
        if (userData) {
          headers['x-company-id'] = userData.companyId || '';
        }

        const response = await fetch(`/api/reports/execution/${executionId}`, { headers });
        if (response.ok) {
          const data = await response.json();
          setExecution(data.execution);

          if (data.execution.status === 'completed' || data.execution.status === 'failed') {
            clearInterval(interval);
            setPollingInterval(null);
          }
        }
      } catch (error) {
        console.error('Error polling execution:', error);
      }
    }, 2000);

    setPollingInterval(interval);
  };

  const handleDownload = () => {
    if (execution?.resultUrl) {
      // In production, this would download the actual file
      // For now, we'll just show the JSON data
      const data = JSON.parse(execution.resultUrl);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/\s+/g, '_')}_report.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'processing':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{template.name}</h2>
          <p className="text-gray-600 dark:text-gray-400">{template.description}</p>
        </div>
        <Badge variant="outline">{template.category}</Badge>
      </div>

      {/* Parameters */}
      {template.parameters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.parameters.map((param) => (
              <div key={param.key}>
                <label className="text-sm font-medium mb-1 block">{param.label}</label>
                {param.type === 'date' ? (
                  <input
                    type="date"
                    value={parameters[param.key] || ''}
                    onChange={(e) => setParameters({ ...parameters, [param.key]: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                ) : param.type === 'select' ? (
                  <select
                    value={parameters[param.key] || ''}
                    onChange={(e) => setParameters({ ...parameters, [param.key]: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select...</option>
                    {param.options?.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={parameters[param.key] || ''}
                    onChange={(e) => setParameters({ ...parameters, [param.key]: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Execute Button */}
      <Button
        onClick={handleExecute}
        disabled={isExecuting || execution?.status === 'processing'}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Play className="w-4 h-4 mr-2" />
        {isExecuting ? 'Starting...' : execution?.status === 'processing' ? 'Processing...' : 'Generate Report'}
      </Button>

      {/* Execution Status */}
      {execution && (
        <Card className={getStatusColor(execution.status)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(execution.status)}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {execution.status}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Started: {new Date(execution.executedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {execution.status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              )}

              {execution.status === 'failed' && (
                <p className="text-sm text-red-600">{execution.error}</p>
              )}
            </div>

            {execution.status === 'completed' && execution.recordCount && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Records: {execution.recordCount} • Format: {execution.resultFormat}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Results */}
      {execution?.status === 'completed' && execution.resultUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <pre className="text-xs overflow-auto max-h-96">
                {JSON.stringify(JSON.parse(execution.resultUrl), null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
