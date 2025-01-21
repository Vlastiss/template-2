"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

interface Job {
  id: string;
  status: string;
  title: string;
  clientName: string;
  createdAt: any;
}

interface JobCounts {
  active: number;
  completed: number;
  pending: number;
}

export default function Home() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobCounts, setJobCounts] = useState<JobCounts>({
    active: 0,
    completed: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const jobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];
      
      setJobs(jobsData);

      // Calculate counts
      const counts = jobsData.reduce((acc, job) => {
        if (job.status === "completed") {
          acc.completed += 1;
        } else if (job.status === "in progress" || job.status === "assigned") {
          acc.active += 1;
        } else {
          acc.pending += 1;
        }
        return acc;
      }, { active: 0, completed: 0, pending: 0 });

      setJobCounts(counts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

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
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">Create New Job</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900">Active Jobs</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {loading ? "..." : jobCounts.active}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900">Completed Jobs</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {loading ? "..." : jobCounts.completed}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900">Pending Jobs</h2>
          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {loading ? "..." : jobCounts.pending}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Jobs</h2>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.slice(0, 5).map((job) => (
                <Link 
                  key={job.id} 
                  href={`/jobs/${job.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">{job.title}</h3>
                      <p className="text-sm text-gray-500">{job.clientName}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      job.status === "completed" ? "bg-green-100 text-green-800" :
                      job.status === "in progress" ? "bg-blue-100 text-blue-800" :
                      job.status === "assigned" ? "bg-purple-100 text-purple-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-gray-600 text-center py-8">
              No jobs found. {user.email?.includes("admin") ? "Create your first job!" : "Check back later for assignments."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
