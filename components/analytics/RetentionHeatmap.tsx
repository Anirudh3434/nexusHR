"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Users, AlertTriangle, Activity } from 'lucide-react';

interface TeamMember {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  riskScore: number | null;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  lastAssessment: Date | null;
}

interface TeamStatistics {
  totalEmployees: number;
  assessedEmployees: number;
  averageRiskScore: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

interface RetentionHeatmapProps {
  team: TeamMember[];
  statistics: TeamStatistics;
}

const getRiskColor = (level: string | null) => {
  switch (level) {
    case 'low': return 'bg-green-500';
    case 'medium': return 'bg-yellow-500';
    case 'high': return 'bg-orange-500';
    case 'critical': return 'bg-red-500';
    default: return 'bg-gray-300';
  }
};

const getRiskTextColor = (level: string | null) => {
  switch (level) {
    case 'low': return 'text-green-700 dark:text-green-400';
    case 'medium': return 'text-yellow-700 dark:text-yellow-400';
    case 'high': return 'text-orange-700 dark:text-orange-400';
    case 'critical': return 'text-red-700 dark:text-red-400';
    default: return 'text-gray-500';
  }
};

export default function RetentionHeatmap({ team, statistics }: RetentionHeatmapProps) {
  const sortedTeam = [...team].sort((a, b) => {
    if (a.riskScore === null && b.riskScore === null) return 0;
    if (a.riskScore === null) return 1;
    if (b.riskScore === null) return -1;
    return (b.riskScore || 0) - (a.riskScore || 0);
  });

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statistics.totalEmployees}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Assessed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statistics.assessedEmployees}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Avg Risk Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.averageRiskScore}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Critical Risk</p>
                <p className="text-2xl font-bold text-red-600">
                  {statistics.riskDistribution.critical}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-full h-3 bg-green-500 rounded-full mb-2" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Low</p>
              <p className="text-2xl font-bold text-green-600">{statistics.riskDistribution.low}</p>
            </div>
            <div className="text-center">
              <div className="w-full h-3 bg-yellow-500 rounded-full mb-2" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Medium</p>
              <p className="text-2xl font-bold text-yellow-600">{statistics.riskDistribution.medium}</p>
            </div>
            <div className="text-center">
              <div className="w-full h-3 bg-orange-500 rounded-full mb-2" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">High</p>
              <p className="text-2xl font-bold text-orange-600">{statistics.riskDistribution.high}</p>
            </div>
            <div className="text-center">
              <div className="w-full h-3 bg-red-500 rounded-full mb-2" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Critical</p>
              <p className="text-2xl font-bold text-red-600">{statistics.riskDistribution.critical}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Retention Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedTeam.map((member) => (
              <div
                key={member.employeeId}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{member.designation}</p>
                </div>

                <div className="flex items-center gap-4">
                  {member.riskScore !== null ? (
                    <>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getRiskTextColor(member.riskLevel)}`}>
                          {member.riskScore}
                        </p>
                        <p className="text-xs text-gray-500">/ 100</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getRiskColor(member.riskLevel)} text-white border-none`}
                      >
                        {member.riskLevel?.toUpperCase()}
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="secondary" className="text-gray-500">
                      Not Assessed
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
