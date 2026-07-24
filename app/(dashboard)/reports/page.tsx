"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Organizational Reports</CardTitle>
          <CardDescription>View detailed analytics and reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic">Reports and analytics UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
