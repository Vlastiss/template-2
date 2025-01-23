"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { FileText, Download } from "lucide-react";

interface Job {
  id: string;
  title: string;
  clientName: string;
  clientContact: string;
  clientAddress: string;
  description: string;
  status: string;
  assignedTo: string;
  startTime: string;
  attachments: string[];
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

  // Function to extract client information from description
  const extractClientInfo = (description: string) => {
    const lines = description.split('\n');
    let clientName = '';
    let clientContact = '';
    let clientAddress = '';
    let jobDescription = '';
    let currentSection = '';
    
    console.log("Starting extraction from description:", description);
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check for section headers (both ### and ** style)
      if (line.startsWith('### ') || line.startsWith('**')) {
        const sectionMatch = line.match(/(?:###\s*|\*\*)(.*?)(?:\*\*)?$/);
        if (sectionMatch) {
          currentSection = sectionMatch[1].trim();
          console.log("Found section:", currentSection);
          continue;
        }
      }

      console.log("Processing line in section", currentSection, ":", trimmedLine);

      switch (currentSection) {
        case 'Client Details':
          // Clean up the line from markdown and special characters
          const cleanLine = trimmedLine
            .replace(/^\s*[-*•]\s*/, '')     // Remove list markers
            .replace(/\*\*/g, '')            // Remove bold markers
            .trim();

          // Check if line contains a label
          const labelMatch = cleanLine.match(/^(Name|Client Name|Phone|Contact|Email|Address):\s*(.+)/i);
          if (labelMatch) {
            const [, label, value] = labelMatch;
            const normalizedLabel = label.toLowerCase();
            if (normalizedLabel.includes('name') && !clientName) {
              clientName = value.trim();
            } else if ((normalizedLabel.includes('phone') || normalizedLabel.includes('contact')) && !clientContact && value.includes('07')) {
              clientContact = value.trim();
            } else if (normalizedLabel.includes('address') && !clientAddress) {
              clientAddress = value.trim();
            }
          }
          break;
        case 'Job Description':
          jobDescription += trimmedLine + '\n';
          break;
      }
    }

    console.log("Extracted info:", {
      clientName,
      clientContact,
      clientAddress,
      jobDescription: jobDescription.trim()
    });

    return { 
      clientName: clientName || 'No client name', 
      clientContact: clientContact || 'No contact info', 
      clientAddress: clientAddress || 'No address',
      jobDescription: jobDescription.trim()
    };
  };

  useEffect(() => {
    const fetchJob = async () => {
      if (!params.id) return;
      
      try {
        const jobDoc = await getDoc(doc(db, "jobs", params.id as string));
        if (jobDoc.exists()) {
          const jobData = jobDoc.data();
          const clientInfo = extractClientInfo(jobData.description);
          setJob({ 
            id: jobDoc.id, 
            ...jobData,
            clientName: jobData.clientName || clientInfo.clientName,
            clientContact: jobData.clientPhone || clientInfo.clientContact,
            clientAddress: jobData.clientAddress || clientInfo.clientAddress,
            description: jobData.description || ''
          } as Job);
        } else {
          setError("Job not found");
        }
      } catch (err) {
        console.error("Error fetching job:", err);
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
      setJob(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error("Error updating job status:", err);
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

  // Function to get job description excluding client details
  const getJobDescription = () => {
    if (!job?.description) return '';
    
    const lines = job.description.split('\n');
    let description = '';
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('### ')) {
        currentSection = line.replace('### ', '').trim();
        continue;
      }

      if (currentSection === 'Job Description' && line.trim()) {
        description += line + '\n';
      }
    }

    return description.trim();
  };

  return (
    <div className="py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title || "Untitled Job"}</h1>
            <div className="flex items-center gap-3">
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
                <p className="text-gray-900">{job.clientName || "No client name"}</p>
                <p className="text-gray-600">{job.clientContact || "No contact info"}</p>
                <p className="text-gray-600">{job.clientAddress || "No address"}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Schedule</h3>
              <div className="mt-2 space-y-2">
                <p className="text-gray-900">Start: {job.startTime ? new Date(job.startTime).toLocaleString() : "Not set"}</p>
                <p className="text-gray-600">Assigned to: {job.assignedTo || "Not assigned"}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-2 text-gray-900 whitespace-pre-wrap">{getJobDescription()}</p>
          </div>

          {job.attachments && job.attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Attachments</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {job.attachments.map((url, index) => {
                  // Check if URL is an image by both extension and content type
                  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || url.includes('image');
                  
                  return (
                    <div key={url} className="border rounded-lg overflow-hidden bg-gray-50">
                      {isImage ? (
                        <div className="relative">
                          {/* Image container with fixed aspect ratio */}
                          <div className="aspect-w-16 aspect-h-9">
                            <img
                              src={url}
                              alt={`Attachment ${index + 1}`}
                              className="object-contain w-full h-full"
                              onError={(e) => {
                                // If image fails to load, show file icon instead
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden flex items-center justify-center">
                              <FileText className="h-16 w-16 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-w-16 aspect-h-9 flex items-center justify-center bg-gray-100">
                          <FileText className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                      <div className="p-3 border-t bg-white">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {isImage ? 'Image' : 'File'} {index + 1}
                          </span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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