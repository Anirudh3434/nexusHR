"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";

export default function LeaveApprovalsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Leave Approvals</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Review and approve or reject leave requests from your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic">Leave approvals UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
