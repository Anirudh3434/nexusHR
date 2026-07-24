"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";

export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Roles & Permissions</h1>
      <Card>
        <CardHeader>
          <CardTitle>Permission Matrices</CardTitle>
          <CardDescription>Fine-tune access control levels for different system roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 italic">Permissions configuration UI coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
