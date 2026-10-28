"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { ShieldCheck } from "lucide-react";

export default function LeaveApprovalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={<ShieldCheck />} title="Leave Approvals" />
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Review and approve or reject leave requests from your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic dark:text-slate-400">Leave approvals UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
