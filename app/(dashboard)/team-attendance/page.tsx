"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";

export default function TeamAttendancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Team Attendance</h1>
      <Card>
        <CardHeader>
          <CardTitle>Team Attendance Logs</CardTitle>
          <CardDescription>Track your team's daily check-ins and check-outs.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic">Team attendance tracking UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
