"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Building } from "lucide-react";

export default function CommandsPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={<Building />} title="Company Management" />
      <Card>
        <CardHeader>
          <CardTitle>Company Overview</CardTitle>
          <CardDescription>Manage organization-level commands and settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic dark:text-slate-400">Super Admin tools coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
