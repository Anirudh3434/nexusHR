"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { ActivitySquare } from "lucide-react";

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={<ActivitySquare />} title="Performance" />
      <Card>
        <CardHeader>
          <CardTitle>Performance Reviews</CardTitle>
          <CardDescription>Track team performance and conduct reviews.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic dark:text-slate-400">Performance review UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
