"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { 
  AlertTriangle, Check, X, Filter, RefreshCw, 
  Clock, User, AlertCircle 
} from 'lucide-react';

interface Alert {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    designation: string;
    department: string;
  };
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: {
    name: string;
  };
  acknowledgedAt?: Date;
  createdAt: Date;
}

export default function RetentionAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterAcknowledged, setFilterAcknowledged] = useState<string>('all');
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [filterSeverity, filterAcknowledged]);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {};
      if (userData) {
        headers['x-company-id'] = userData.companyId || '';
        headers['x-user-role'] = userData.role || '';
      }

      const params = new URLSearchParams();
      if (filterSeverity !== 'all') params.append('severity', filterSeverity);
      if (filterAcknowledged !== 'all') params.append('acknowledged', filterAcknowledged);

      const response = await fetch(`/api/analytics/retention/alerts?${params}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (userData) {
        headers['x-user-id'] = userData.id || '';
        headers['x-company-id'] = userData.companyId || '';
      }

      const response = await fetch(`/api/analytics/retention/acknowledge/${alertId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });

      if (response.ok) {
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      const storedUser = localStorage.getItem('user');
      const userData = storedUser ? JSON.parse(storedUser) : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (userData) {
        headers['x-company-id'] = userData.companyId || '';
        headers['x-user-role'] = userData.role || '';
      }

      const response = await fetch('/api/analytics/retention/recalculate', {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Recalculated ${data.processed} employee predictions`);
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Error recalculating predictions:', error);
      alert('Failed to recalculate predictions');
    } finally {
      setIsRecalculating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'risk_increase': return 'Risk Increase';
      case 'critical_risk': return 'Critical Risk';
      case 'pattern_change': return 'Pattern Change';
      case 'threshold_crossed': return 'Threshold Crossed';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Retention Alerts</h2>
          <p className="text-gray-600 dark:text-gray-400">Monitor and manage retention risk alerts</p>
        </div>
        <Button
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
          {isRecalculating ? 'Recalculating...' : 'Recalculate Predictions'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="p-2 border rounded-md text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <select
              value={filterAcknowledged}
              onChange={(e) => setFilterAcknowledged(e.target.value)}
              className="p-2 border rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="false">Unacknowledged</option>
              <option value="true">Acknowledged</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">Loading alerts...</CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No alerts found. All clear!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card
              key={alert._id}
              className={`${getSeverityBgColor(alert.severity)} ${alert.acknowledged ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`${getSeverityColor(alert.severity)} text-white border-none`}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary">
                        {getAlertTypeLabel(alert.alertType)}
                      </Badge>
                      {alert.acknowledged && (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          <Check className="w-3 h-3 mr-1" />
                          Acknowledged
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {alert.employeeId.name}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        • {alert.employeeId.designation}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        • {alert.employeeId.department}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {alert.message}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                      {alert.acknowledged && alert.acknowledgedBy && (
                        <div className="flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Acknowledged by {alert.acknowledgedBy.name}
                          {alert.acknowledgedAt && (
                            <span>• {new Date(alert.acknowledgedAt).toLocaleString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!alert.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(alert._id)}
                      className="ml-4"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
