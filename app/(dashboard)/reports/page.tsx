"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" />
      <Card>
        <CardHeader>
          <CardTitle>Organizational Reports</CardTitle>
          <CardDescription>View detailed analytics and reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic dark:text-slate-400">Reports and analytics UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
