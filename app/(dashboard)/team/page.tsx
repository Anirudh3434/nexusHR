"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Team Overview</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Team</CardTitle>
          <CardDescription>Manage your team members and their direct reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic">Team management UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
