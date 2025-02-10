"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { collection, query, orderBy, onSnapshot, where, or } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { PlusCircle } from "lucide-react";
import { SparklesCore } from "@/components/ui/sparkles";

interface Job {
  id: string;
  status: string;
  title: string;
  clientName: string;
  createdAt: any;
  assignedToId: string;
  assignedTo: string;
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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const tokenResult = await user.getIdTokenResult();
        setIsAdmin(tokenResult.claims.role === 'admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    console.log('Current user:', user.email);
    console.log('Is admin?', isAdmin);

    let jobsQuery;
    if (isAdmin) {
      // Admin sees all jobs
      jobsQuery = query(
        collection(db, "jobs"), 
        orderBy("createdAt", "desc")
      );
      console.log('Using admin query');
    } else {
      // Employee sees only their assigned jobs by email
      console.log('Using employee query for:', user.email);
      // Debug the query parameters
      const employeeQuery = query(
        collection(db, "jobs"),
        where("assignedTo", "==", user.email),
        orderBy("createdAt", "desc")
      );
      console.log('Query constraints:', (employeeQuery as any)._query.filters);
      jobsQuery = employeeQuery;
    }
    
    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      console.log('Query snapshot size:', snapshot.size);
      console.log('Query snapshot docs:', snapshot.docs.map(doc => doc.data()));
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];
      
      console.log('Processed jobs:', jobsData);
      setJobs(jobsData);

      // Updated counting logic to handle case variations
      const counts = jobsData.reduce((acc, job) => {
        const status = job.status?.toLowerCase()?.trim();
        if (status === "completed") {
          acc.completed += 1;
        } else if (["in-progress", "in progress", "assigned"].includes(status)) {
          acc.active += 1;
        } else {
          acc.pending += 1;
        }
        return acc;
      }, { active: 0, completed: 0, pending: 0 });

      console.log('Job counts:', counts);
      setJobCounts(counts);
      setLoading(false);
    }, (error) => {
      console.error('Firestore query error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  if (!user) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center overflow-hidden rounded-md fixed">
        <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20">
          Work<span className="text-blue-500 italic">Card</span>X
        </h1>
        <div className="w-[40rem] h-40 relative">
          {/* Gradients */}
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent h-[2px] w-3/4 blur-sm" />
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent h-px w-3/4" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

          {/* Core sparkles component */}
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={1200}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />

          {/* Radial Gradient to prevent sharp edges */}
          <div className="absolute inset-0 w-full h-full bg-background [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
        </div>
        
        {/* Additional content */}
        <div className="relative z-20 mt-4">
          <p className="text-neutral-300 text-xl text-center mb-8">
            Streamline your job management workflow
          </p>
          <div className="flex justify-center">
            <Link href="/login">
              <Button 
                size="lg"
                className="px-8 py-6 text-lg bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full bg-background pt-20 relative">
      <div className="max-w-7xl mx-auto px-4 h-full flex flex-col">
        {/* Fixed Header Section */}
        <div className="flex justify-between items-center bg-background p-6 rounded-lg shadow-sm border-border">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          {isAdmin && (
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

        {/* Fixed Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
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

        {/* Scrollable Recent Jobs Section */}
        <div className="mt-6 flex-1 min-h-0">
          <div className="bg-background rounded-lg shadow-sm border border-border h-full flex flex-col">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Recent Jobs</h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
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
                          job.status?.toLowerCase()?.trim() === "completed" ? "bg-green-500/20 text-green-500" :
                          job.status?.toLowerCase()?.trim() === "in progress" ? "bg-blue-500/20 text-blue-500" :
                          job.status?.toLowerCase()?.trim() === "assigned" ? "bg-purple-500/20 text-purple-500" :
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
                  No jobs found. {isAdmin ? "Create your first job!" : "Check back later for assignments."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
