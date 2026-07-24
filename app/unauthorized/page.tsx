"use client";

import React from "react";
import Link from "next/link";
import { Button } from "../../components/ui/Button";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="rounded-full bg-red-100 p-6 dark:bg-red-900/30">
        <svg className="w-16 h-16 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Access Denied</h1>
        <p className="text-lg text-gray-500 max-w-md dark:text-gray-400">
          You do not have the required permissions to view this page. Please contact your system administrator if you believe this is an error.
        </p>
      </div>
      <Link href="/dashboard">
        <Button size="lg" className="mt-4">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
