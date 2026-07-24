"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table";
import { Button } from "../../../components/ui/Button";

const MOCK_CANDIDATES = [
  { id: "C-101", name: "Sarah Jenkins", role: "Frontend Engineer", stage: "Interview", dateApplied: "2024-10-15", rating: "★★★★☆" },
  { id: "C-102", name: "David Chen", role: "Product Manager", stage: "Screening", dateApplied: "2024-10-18", rating: "★★★☆☆" },
  { id: "C-103", name: "Mia Rodriguez", role: "UX Designer", stage: "Offered", dateApplied: "2024-10-02", rating: "★★★★★" },
  { id: "C-104", name: "James Wilson", role: "Backend Engineer", stage: "Hired", dateApplied: "2024-09-28", rating: "★★★★★" },
  { id: "C-105", name: "Elena Petrova", role: "Marketing Specialist", stage: "Applied", dateApplied: "2024-10-22", rating: "Pending" },
];

export default function RecruitmentPage() {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();

  // Basic security routing specific for HR and Admins mapping to this page
  useEffect(() => {
    if (!loading && user && !hasRole(["admin", "hr"])) {
      router.push("/unauthorized");
    }
  }, [user, loading, hasRole, router]);

  if (loading || !user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruitment Pipeline</h1>
          <p className="text-gray-500">Manage candidates, track application states, and process offers.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Import
          </Button>
          <Button>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Candidate
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-gray-400 mt-1">+12 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Currently Interviewing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">24</div>
            <p className="text-xs text-gray-400 mt-1">Active funnel</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Offers Extended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">4</div>
            <p className="text-xs text-gray-400 mt-1">Pending signing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Hired (Oct)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">9</div>
            <p className="text-xs text-gray-400 mt-1">100% accepted</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Candidates</CardTitle>
          <CardDescription>Review applicant tracking details across ongoing open positions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Date Applied</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_CANDIDATES.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{candidate.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{candidate.id}</div>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{candidate.role}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{candidate.dateApplied}</TableCell>
                  <TableCell className="text-yellow-500 text-sm tracking-widest">{candidate.rating}</TableCell>
                  <TableCell>
                    <span 
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium 
                      ${candidate.stage === 'Hired' || candidate.stage === 'Offered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : candidate.stage === 'Interview' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}
                    >
                      {candidate.stage}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
