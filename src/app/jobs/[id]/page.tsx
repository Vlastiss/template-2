"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { FileText, Download, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { uploadFile } from "@/lib/firebase/firebaseUtils";
import { cn } from "@/lib/utils";

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
  feedback?: string;
  feedbackAttachments?: string[];
  createdAt: any;
  updatedAt: any;
}

const getFileType = (url: string): 'image' | 'video' | 'pdf' | 'doc' | 'other' => {
  try {
    const decodedUrl = decodeURIComponent(url);
    if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(decodedUrl)) return 'image';
    if (/\.(mov|mp4|webm|avi)/i.test(decodedUrl)) return 'video';
    if (/\.pdf/i.test(decodedUrl)) return 'pdf';
    if (/\.(doc|docx)/i.test(decodedUrl)) return 'doc';
    return 'other';
  } catch {
    return 'other';
  }
};

const FilePreview = ({ url, onClick }: { url: string; onClick: () => void }) => {
  const fileType = getFileType(url);

  return (
    <div 
      className="relative aspect-video rounded-lg overflow-hidden bg-gray-50 cursor-pointer hover:bg-gray-100"
      onClick={onClick}
    >
      {fileType === 'image' && (
        <img
          src={url}
          alt="File preview"
          className="w-full h-full object-contain"
        />
      )}
      {fileType === 'video' && (
        <div className="relative w-full h-full">
          <video
            src={url}
            className="w-full h-full object-contain"
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/5">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[8px] border-l-black border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1" />
            </div>
          </div>
        </div>
      )}
      {(fileType === 'pdf' || fileType === 'doc') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <FileText className={cn(
            "w-12 h-12",
            fileType === 'pdf' ? "text-red-500" : "text-blue-500"
          )} />
          <span className="mt-2 text-sm font-medium text-gray-500">
            {fileType.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-green-900/30 text-green-400";
    case "in progress":
      return "bg-blue-900/30 text-blue-400";
    case "assigned":
      return "bg-purple-900/30 text-purple-400";
    case "new":
      return "bg-gray-800/50 text-gray-300";
    default:
      return "bg-gray-800/50 text-gray-300";
  }
};

export default function JobDetailsPage() {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionAttachments, setCompletionAttachments] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to extract client information from description
  const extractClientInfo = (description: string) => {
    console.log('Raw description:', description);
    const lines = description.split('\n');
    let clientName = '';
    let clientContact = '';
    let clientAddress = '';
    let jobDescription = '';
    let currentSection = '';
    let isInJobDescription = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check for new section header
      if (trimmedLine.startsWith('### ')) {
        console.log('Found section:', trimmedLine);
        if (isInJobDescription) {
          // We've hit a new section after Job Description, so we're done
          console.log('Ending job description at:', trimmedLine);
          break;
        }
        currentSection = trimmedLine.replace('### ', '').replace(':', '').trim();
        isInJobDescription = currentSection === 'Job Description';
        if (isInJobDescription) {
          console.log('Starting job description');
        }
        continue;
      }

      // Only add lines when we're in Job Description section
      if (isInJobDescription) {
        console.log('Adding line to description:', trimmedLine);
        jobDescription += trimmedLine + '\n';
      }

      if (currentSection === 'Client Details') {
        const cleanLine = trimmedLine
          .replace(/^\s*[-*•]\s*/, '')
          .replace(/\*\*/g, '')
          .trim();

        if (cleanLine.toLowerCase().includes('name:')) {
          clientName = cleanLine.split(':')[1].trim();
        } else if (cleanLine.toLowerCase().includes('phone:')) {
          clientContact = cleanLine.split(':')[1].trim();
        } else if (cleanLine.toLowerCase().includes('address:')) {
          clientAddress = cleanLine.split(':')[1].trim();
        }
      }
    }

    console.log('Final job description:', jobDescription.trim());
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
          console.log('Raw job data:', jobData);
          
          const clientInfo = extractClientInfo(jobData.description);
          
          const newJob = {
            id: jobDoc.id,
            ...jobData,
            clientName: jobData.clientName || clientInfo.clientName,
            clientContact: jobData.clientPhone || clientInfo.clientContact,
            clientAddress: jobData.clientAddress || clientInfo.clientAddress,
            description: clientInfo.jobDescription || jobData.description || '',
            attachments: jobData.attachments || [],
            feedback: jobData.feedback || '',
            feedbackAttachments: jobData.feedbackAttachments || []
          } as Job;
          
          console.log('Processed job data:', {
            status: newJob.status,
            attachments: newJob.attachments,
            feedback: newJob.feedback,
            feedbackAttachments: newJob.feedbackAttachments
          });
          
          setJob(newJob);
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

  const updateJobStatus = async (newStatus: string, completionData?: { notes: string, attachments: string[] }) => {
    if (!job) return;
    
    setUpdating(true);
    try {
      const jobRef = doc(db, "jobs", job.id);
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === 'completed' && completionData) {
        updateData.feedback = completionData.notes;
        updateData.feedbackAttachments = completionData.attachments || [];
        console.log('Setting feedback data:', updateData);
      }

      await updateDoc(jobRef, updateData);
      const updatedJob = { ...job, ...updateData };
      console.log('Updated job:', updatedJob);
      setJob(updatedJob);
    } catch (err) {
      console.error("Error updating job status:", err);
      setError("Failed to update job status");
    } finally {
      setUpdating(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !job) return;

    setUploadingFiles(true);
    try {
      const uploadPromises = Array.from(files).map(file =>
        uploadFile(file, `jobs/${job.id}/completion/${file.name}`)
      );
      const urls = await Promise.all(uploadPromises);
      setCompletionAttachments(prev => [...prev, ...urls]);
    } catch (err) {
      console.error("Error uploading files:", err);
      setError("Failed to upload files");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleComplete = async () => {
    if (!completionNotes.trim()) {
      setError("Please provide completion notes");
      return;
    }

    console.log('Completing job with:', {
      notes: completionNotes,
      attachments: completionAttachments
    });

    await updateJobStatus("completed", {
      notes: completionNotes,
      attachments: completionAttachments
    });
    setShowCompletionDialog(false);
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
            <h1 className="text-2xl font-bold text-gray-100 mb-2">{job.title || "Untitled Job"}</h1>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                {job.status}
              </span>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-gray-800 hover:bg-gray-800/50"
          >
            Back
          </Button>
        </div>

        <Carousel className="w-full">
          <CarouselContent>
            {/* First Slide: Original Job Details */}
            <CarouselItem>
              <div className="bg-gray-900/50 shadow-lg rounded-lg border border-gray-800 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Client Information</h3>
                    <div className="mt-2 space-y-2">
                      <p className="text-gray-100">{job.clientName || "No client name"}</p>
                      <p className="text-gray-400">{job.clientContact || "No contact info"}</p>
                      <p className="text-gray-400">{job.clientAddress || "No address"}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Schedule</h3>
                    <div className="mt-2 space-y-2">
                      <p className="text-gray-100">Start: {job.startTime ? new Date(job.startTime).toLocaleString() : "Not set"}</p>
                      <p className="text-gray-400">Assigned to: {job.assignedTo || "Not assigned"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400">Description</h3>
                  <p className="mt-2 text-gray-200 whitespace-pre-wrap">{job.description}</p>
                </div>

                {job.attachments && job.attachments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Original Attachments</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {job.attachments.map((url) => (
                        <FilePreview
                          key={url}
                          url={url}
                          onClick={() => setSelectedFile(url)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-400 pt-4 border-t border-gray-800">
                  <p>Created: {job.createdAt?.toDate ? formatDate(job.createdAt.toDate()) : "N/A"}</p>
                  <p>Last Updated: {job.updatedAt?.toDate ? formatDate(job.updatedAt.toDate()) : "N/A"}</p>
                </div>
              </div>
            </CarouselItem>

            {/* Second Slide: Completion Feedback */}
            <CarouselItem>
              <div className="bg-gray-900/50 shadow-lg rounded-lg border border-gray-800 p-6 space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-100">Completion Details</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>

                {job.status === "completed" ? (
                  <>
                    {job.feedback ? (
                      <>
                        <div className="bg-gray-800/50 rounded-lg p-6">
                          <h3 className="text-lg font-medium text-gray-200 mb-4">Completion Notes</h3>
                          <p className="text-gray-300 whitespace-pre-wrap">{job.feedback}</p>
                        </div>

                        {job.feedbackAttachments && job.feedbackAttachments.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-lg font-medium text-gray-200 mb-4">Completion Attachments</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {job.feedbackAttachments.map((url) => (
                                <FilePreview
                                  key={url}
                                  url={url}
                                  onClick={() => setSelectedFile(url)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-400">This job is marked as completed but no completion feedback was provided.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400">This job has not been completed yet.</p>
                    {!user?.email?.includes("admin") && (
                      <Button
                        onClick={() => setShowCompletionDialog(true)}
                        className="mt-4"
                        disabled={updating}
                      >
                        Mark as Complete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious className="left-4" />
          <CarouselNext className="right-4" />
        </Carousel>

        {/* Admin Status Controls */}
        {user?.email?.includes("admin") && (
          <div className="mt-6 p-6 bg-gray-900/50 shadow-lg rounded-lg border border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Update Status</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                variant={job.status === "new" ? "default" : "outline"}
                onClick={() => updateJobStatus("new")}
                disabled={updating || job.status === "new"}
                className={job.status !== "new" ? "border-gray-800 hover:bg-gray-800/50" : ""}
              >
                New
              </Button>
              <Button
                size="sm"
                variant={job.status === "assigned" ? "default" : "outline"}
                onClick={() => updateJobStatus("assigned")}
                disabled={updating || job.status === "assigned"}
                className={job.status !== "assigned" ? "border-gray-800 hover:bg-gray-800/50" : ""}
              >
                Assigned
              </Button>
              <Button
                size="sm"
                variant={job.status === "in progress" ? "default" : "outline"}
                onClick={() => updateJobStatus("in progress")}
                disabled={updating || job.status === "in progress"}
                className={job.status !== "in progress" ? "border-gray-800 hover:bg-gray-800/50" : ""}
              >
                In Progress
              </Button>
              <Button
                size="sm"
                variant={job.status === "completed" ? "default" : "outline"}
                onClick={() => updateJobStatus("completed")}
                disabled={updating || job.status === "completed"}
                className={job.status !== "completed" ? "border-gray-800 hover:bg-gray-800/50" : ""}
              >
                Completed
              </Button>
            </div>
          </div>
        )}

        <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Job</DialogTitle>
              <DialogDescription>
                Add completion notes and any relevant attachments
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <textarea
                className="w-full min-h-[100px] p-3 rounded-md bg-gray-700 text-gray-100 border border-gray-600"
                placeholder="Enter completion notes..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
              />
              
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingFiles ? "Uploading..." : "Upload Attachments"}
                </Button>
              </div>

              {completionAttachments.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {completionAttachments.map((url, index) => (
                    <FilePreview
                      key={index}
                      url={url}
                      onClick={() => setSelectedFile(url)}
                    />
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCompletionDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleComplete}
                disabled={!completionNotes || uploadingFiles}
              >
                Complete Job
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="max-w-4xl bg-gray-900 border border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-100">File Preview</DialogTitle>
            <DialogDescription>
              <a 
                href={selectedFile || ''} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
              >
                Open original
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full bg-gray-800/50 rounded-lg overflow-hidden">
            {selectedFile && (() => {
              const fileType = getFileType(selectedFile);
              
              switch (fileType) {
                case 'video':
                  return (
                    <div className="aspect-video bg-black">
                      <video
                        src={selectedFile}
                        controls
                        className="w-full h-full"
                        autoPlay
                        playsInline
                      />
                    </div>
                  );
                case 'image':
                  return (
                    <div className="aspect-video">
                      <img
                        src={selectedFile}
                        alt="Full preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  );
                case 'pdf':
                case 'doc':
                  return (
                    <div className="h-[80vh]">
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedFile)}&embedded=true`}
                        className="w-full h-full rounded-lg"
                        frameBorder="0"
                      />
                    </div>
                  );
                default:
                  return (
                    <div className="p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">Preview not available</p>
                      <a 
                        href={selectedFile} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-4 inline-block text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        Download file
                      </a>
                    </div>
                  );
              }
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 