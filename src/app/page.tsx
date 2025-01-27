"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { PlusCircle } from "lucide-react";

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
  const { user, isAdmin } = useAuth();
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
        <h1 className="text-4xl font-bold">Welcome to Handyman Jobs</h1>
        <p className="text-xl text-muted-foreground">Please sign in to manage your jobs</p>
        <Link href="/login">
          <Button 
            size="lg"
            variant="default"
            className="px-8 py-3 text-lg"
          >
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-background p-6 rounded-lg shadow-sm border border-border">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {isAdmin() && (
          <Link href="/jobs/new">
            <Button 
              size="lg"
              variant="default"
              className="px-8 py-3 text-lg font-semibold flex items-center gap-2"
            >
              <PlusCircle className="w-6 h-6" />
              Create New Job
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
          <h2 className="text-lg font-semibold">Active Jobs</h2>
          <p className="text-3xl font-bold text-blue-500 mt-2">
            {loading ? "..." : jobCounts.active}
          </p>
        </div>

        <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
          <h2 className="text-lg font-semibold">Completed Jobs</h2>
          <p className="text-3xl font-bold text-green-500 mt-2">
            {loading ? "..." : jobCounts.completed}
          </p>
        </div>

        <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
          <h2 className="text-lg font-semibold">Pending Jobs</h2>
          <p className="text-3xl font-bold text-yellow-500 mt-2">
            {loading ? "..." : jobCounts.pending}
          </p>
        </div>
      </div>

      <div className="bg-background rounded-lg shadow-sm border border-border">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Jobs</h2>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.slice(0, 5).map((job) => (
                <Link 
                  key={job.id} 
                  href={`/jobs/${job.id}`}
                  className="block p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">{job.clientName}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      job.status === "completed" ? "bg-green-500/20 text-green-500" :
                      job.status === "in progress" ? "bg-blue-500/20 text-blue-500" :
                      job.status === "assigned" ? "bg-purple-500/20 text-purple-500" :
                      "bg-gray-500/20 text-gray-500"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-8">
              No jobs found. {isAdmin() ? "Create your first job!" : "Check back later for assignments."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
