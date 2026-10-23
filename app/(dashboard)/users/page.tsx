"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="User Management" />
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user accounts, roles, and access across the organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic dark:text-slate-400">Global user management UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
