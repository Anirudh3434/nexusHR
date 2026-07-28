"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface RetentionFactor {
  name: string;
  value: number;
  weight: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface RetentionData {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RetentionFactor[];
  lastAssessment: Date;
  previousRiskScore?: number;
}

const factorLabels: Record<string, string> = {
  attendance: 'Attendance',
  performance: 'Performance',
  engagement: 'Engagement',
  tenure: 'Tenure',
  compensation: 'Compensation',
  workload: 'Workload',
  manager_relationship: 'Manager Relationship',
};

const getRiskColor = (level: string) => {
  switch (level) {
    case 'low': return 'bg-green-500';
    case 'medium': return 'bg-yellow-500';
    case 'high': return 'bg-orange-500';
    case 'critical': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getRiskBgColor = (level: string) => {
  switch (level) {
    case 'low': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    case 'medium': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    case 'high': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
    case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
    default: return <Minus className="w-4 h-4 text-gray-400" />;
  }
};

export default function RetentionRiskCard({ data }: { data: RetentionData }) {
  const riskChange = data.previousRiskScore !== undefined 
    ? data.riskScore - data.previousRiskScore 
    : null;

  return (
    <Card className={`border-2 ${getRiskBgColor(data.riskLevel)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Retention Risk
          </CardTitle>
          <Badge variant="outline" className={`${getRiskColor(data.riskLevel)} text-white border-none`}>
            {data.riskLevel.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Risk Score</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.riskScore}
              <span className="text-lg text-gray-500">/100</span>
            </p>
          </div>
          {riskChange !== null && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              riskChange > 0 ? 'text-red-600' : riskChange < 0 ? 'text-green-600' : 'text-gray-500'
            }`}>
              {riskChange > 0 ? <TrendingUp className="w-4 h-4" /> : riskChange < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              {riskChange > 0 ? '+' : ''}{riskChange}
            </div>
          )}
        </div>

        {/* Risk Factors */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Risk Factors</p>
          <div className="space-y-2">
            {data.factors.map((factor, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  {getTrendIcon(factor.trend)}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {factorLabels[factor.name] || factor.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${factor.value >= 70 ? 'bg-green-500' : factor.value >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${factor.value}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8 text-right">
                    {Math.round(factor.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last Assessment */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Last assessed: {new Date(data.lastAssessment).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
