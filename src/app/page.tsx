"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Welcome to Handyman Jobs</h1>
        <p className="text-xl text-gray-600">Please sign in to manage your jobs</p>
        <Link href="/login">
          <Button size="lg">Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {user.email?.includes("admin") && (
          <Link href="/jobs/new">
            <Button>Create New Job</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900">Active Jobs</h2>
          <p className="text-3xl font-bold text-primary mt-2">0</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900">Completed Jobs</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">0</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900">Pending Jobs</h2>
          <p className="text-3xl font-bold text-yellow-600 mt-2">0</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Jobs</h2>
          <div className="text-gray-600 text-center py-8">
            No jobs found. {user.email?.includes("admin") ? "Create your first job!" : "Check back later for assignments."}
          </div>
        </div>
      </div>
    </div>
  );
}
