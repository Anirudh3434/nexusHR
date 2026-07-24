"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user accounts, roles, and access across the organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic">Global user management UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
