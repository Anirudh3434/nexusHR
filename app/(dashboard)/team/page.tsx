"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Users } from "lucide-react";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={<Users />} title="Team Overview" />
      <Card>
        <CardHeader>
          <CardTitle>Your Team</CardTitle>
          <CardDescription>Manage your team members and their direct reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic dark:text-slate-400">Team management UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
