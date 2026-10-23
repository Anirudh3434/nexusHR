"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";

export default function TeamAttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Team Attendance" />
      <Card>
        <CardHeader>
          <CardTitle>Team Attendance Logs</CardTitle>
          <CardDescription>Track your team's daily check-ins and check-outs.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic dark:text-slate-400">Team attendance tracking UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
