"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  clientName: string;
  clientContact: string;
  clientAddress: string;
  description: string;
  priority: string;
  status: string;
  expectedCompletionDate: string;
  expectedCompletionTime: string;
  requiresToolsMaterials: string;
  assignedToId?: string;
  createdAt: any;
  updatedAt: any;
}

export default function JobDetailsPage() {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const jobDoc = await getDoc(doc(db, "jobs", params.id as string));
        if (jobDoc.exists()) {
          setJob({ id: jobDoc.id, ...jobDoc.data() } as Job);
        } else {
          setError("Job not found");
        }
      } catch (err) {
        setError("Failed to load job details");
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [params.id]);

  const updateJobStatus = async (newStatus: string) => {
    if (!job) return;
    
    setUpdating(true);
    try {
      const jobRef = doc(db, "jobs", job.id);
      await updateDoc(jobRef, {
        status: newStatus,
        updatedAt: new Date(),
      });
      setJob({ ...job, status: newStatus });
    } catch (err) {
      setError("Failed to update job status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-600">{error || "Job not found"}</p>
        <Button
          variant="ghost"
          onClick={() => router.push("/jobs")}
          className="mt-4"
        >
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(job.priority)}`}>
                {job.priority}
              </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                {job.status}
              </span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            onClick={() => router.back()}
          >
            Back
          </Button>
        </div>

        <div className="bg-white shadow-sm rounded-lg border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Client Information</h3>
              <div className="mt-2 space-y-2">
                <p className="text-gray-900">{job.clientName}</p>
                <p className="text-gray-600">{job.clientContact}</p>
                <p className="text-gray-600">{job.clientAddress}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Schedule</h3>
              <div className="mt-2 space-y-2">
                <p className="text-gray-900">Due: {formatDate(job.expectedCompletionDate)}</p>
                <p className="text-gray-600">Time: {job.expectedCompletionTime}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-2 text-gray-900 whitespace-pre-wrap">{job.description}</p>
          </div>

          {job.requiresToolsMaterials && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Required Tools & Materials</h3>
              <p className="mt-2 text-gray-900 whitespace-pre-wrap">{job.requiresToolsMaterials}</p>
            </div>
          )}

          {user?.email?.includes("admin") && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Update Status</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  variant={job.status === "new" ? "default" : "ghost"}
                  onClick={() => updateJobStatus("new")}
                  disabled={updating || job.status === "new"}
                >
                  New
                </Button>
                <Button
                  size="sm"
                  variant={job.status === "assigned" ? "default" : "ghost"}
                  onClick={() => updateJobStatus("assigned")}
                  disabled={updating || job.status === "assigned"}
                >
                  Assigned
                </Button>
                <Button
                  size="sm"
                  variant={job.status === "in progress" ? "default" : "ghost"}
                  onClick={() => updateJobStatus("in progress")}
                  disabled={updating || job.status === "in progress"}
                >
                  In Progress
                </Button>
                <Button
                  size="sm"
                  variant={job.status === "completed" ? "default" : "ghost"}
                  onClick={() => updateJobStatus("completed")}
                  disabled={updating || job.status === "completed"}
                >
                  Completed
                </Button>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500 pt-4 border-t">
            <p>Created: {job.createdAt?.toDate ? formatDate(job.createdAt.toDate()) : "N/A"}</p>
            <p>Last Updated: {job.updatedAt?.toDate ? formatDate(job.updatedAt.toDate()) : "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "urgent":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "in progress":
      return "bg-blue-100 text-blue-800";
    case "assigned":
      return "bg-purple-100 text-purple-800";
    case "new":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}; 