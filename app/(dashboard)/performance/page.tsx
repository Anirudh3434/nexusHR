"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Performance</h1>
      <Card>
        <CardHeader>
          <CardTitle>Performance Reviews</CardTitle>
          <CardDescription>Track team performance and conduct reviews.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic">Performance review UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
