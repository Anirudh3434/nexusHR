"use client";

import React, { useState } from 'react';
import RetentionRiskCard from '../../../components/analytics/RetentionRiskCard';
import RetentionHeatmap from '../../../components/analytics/RetentionHeatmap';
import RetentionAlerts from '../../../components/analytics/RetentionAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Activity, Users, AlertTriangle, TrendingUp } from 'lucide-react';

export default function RetentionAnalyticsPage() {
  const [view, setView] = useState<'overview' | 'team' | 'alerts'>('overview');

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Retention Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400">Monitor employee retention risk and take proactive action</p>
          </div>
        </div>

        {/* View Selector */}
        <div className="flex gap-2">
          <Button
            variant={view === 'overview' ? 'default' : 'outline'}
            onClick={() => setView('overview')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Activity className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={view === 'team' ? 'default' : 'outline'}
            onClick={() => setView('team')}
          >
            <Users className="w-4 h-4 mr-2" />
            Team View
          </Button>
          <Button
            variant={view === 'alerts' ? 'default' : 'outline'}
            onClick={() => setView('alerts')}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerts
          </Button>
        </div>

        {/* Content based on view */}
        {view === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Individual Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Select an employee to view their detailed retention risk analysis.
                </p>
                <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                  Employee selector will be integrated here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Activity className="w-4 h-4 mr-2" />
                  Run Company-Wide Predictions
                </Button>
                <Button variant="outline" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  View Department Reports
                </Button>
                <Button variant="outline" className="w-full">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Review Critical Alerts
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {view === 'team' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Retention Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Select a department to view team retention risk distribution.
              </p>
              <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                Department selector will be integrated here
              </div>
            </CardContent>
          </Card>
        )}

        {view === 'alerts' && (
          <RetentionAlerts />
        )}
      </div>
    </div>
  );
}
