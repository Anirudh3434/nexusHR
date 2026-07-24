"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";

export default function CommandsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Company Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Company Overview</CardTitle>
          <CardDescription>Manage organization-level commands and settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic">Super Admin tools coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
