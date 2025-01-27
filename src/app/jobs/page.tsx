"use client";

import { Fragment, useEffect, useState, useRef } from "react";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDoc, Timestamp, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronDown, ChevronUp, Info, Trash2, ChevronRight, FileText, Image as ImageIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  Row,
  Column,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  status: 'new' | 'pending' | 'in-progress' | 'completed';
  startTime: Timestamp | Date | string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  description?: string;
  assignedTo?: string;
  feedback?: string;
  attachments?: string[];
}

const getPriorityColor = (priority: string | undefined) => {
  if (!priority) return 'bg-gray-100 text-gray-800';

  switch (priority.toLowerCase()) {
    case 'low':
      return 'bg-blue-100 text-blue-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'urgent':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
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

const isImageFile = (url: string) => {
  try {
    // For Firebase Storage URLs, check if it contains 'jobs' folder and common image extensions
    const decodedUrl = decodeURIComponent(url);
    return decodedUrl.includes('/jobs/') && 
           /\.(jpg|jpeg|png|gif|webp|svg|JPG|JPEG|PNG|GIF|WEBP|SVG)/.test(decodedUrl);
  } catch (error) {
    console.error('Error in isImageFile:', error);
    return false;
  }
};

const getFileIcon = (url: string) => {
  if (isImageFile(url)) {
    return <ImageIcon className="w-6 h-6" />;
  }
  return <FileText className="w-6 h-6" />;
};

const ImageDebug = ({ url }: { url: string }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      console.log('Debug - Image loaded:', url);
      setStatus('success');
    };
    img.onerror = () => {
      console.error('Debug - Image failed:', url);
      setStatus('error');
    };
    img.src = url;
  }, [url]);

  return (
    <div className="absolute top-0 right-0 p-0.5">
      <div 
        className={cn(
          "w-2 h-2 rounded-full",
          status === 'loading' && "bg-yellow-500",
          status === 'success' && "bg-green-500",
          status === 'error' && "bg-red-500"
        )}
      />
    </div>
  );
};

const ImageThumbnail = ({ url }: { url: string }) => {
  return (
    <div className="relative w-12 h-12 rounded border overflow-hidden hover:bg-gray-100 cursor-pointer group">
      <img
        src={url}
        alt="Attachment preview"
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement('div');
            fallback.className = 'w-full h-full flex items-center justify-center bg-gray-50';
            fallback.innerHTML = '<svg class="w-6 h-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
            parent.appendChild(fallback);
          }
        }}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
    </div>
  );
};

// Update the getFileType function to better handle video files
const getFileType = (url: string): 'image' | 'video' | 'pdf' | 'doc' | 'other' => {
  try {
    const decodedUrl = decodeURIComponent(url);
    // Check for video files first
    if (/\.(mov|mp4|webm|avi|quicktime|MOV|MP4|WEBM|AVI)/i.test(decodedUrl)) return 'video';
    // Then check for images
    if (/\.(jpg|jpeg|png|gif|webp|svg|JPG|JPEG|PNG|GIF|WEBP|SVG)/i.test(decodedUrl)) return 'image';
    // Then PDFs
    if (/\.pdf/i.test(decodedUrl)) return 'pdf';
    // Then documents
    if (/\.(doc|docx)/i.test(decodedUrl)) return 'doc';
    // Check MIME type in URL if present
    if (decodedUrl.includes('video/')) return 'video';
    if (decodedUrl.includes('image/')) return 'image';
    if (decodedUrl.includes('application/pdf')) return 'pdf';
    if (decodedUrl.includes('application/msword') || decodedUrl.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) return 'doc';
    return 'other';
  } catch (error) {
    console.error('Error in getFileType:', error);
    return 'other';
  }
};

// Update the FilePreview component
const FilePreview = ({ url }: { url: string }) => {
  const fileType = getFileType(url);
  const [previewError, setPreviewError] = useState(false);

  return (
    <div 
      className="relative w-12 h-12 rounded border overflow-hidden hover:bg-gray-800 cursor-pointer group"
      role="button"
      aria-label={`Preview ${fileType} file`}
    >
      {fileType === 'image' && !previewError ? (
        <img
          src={url}
          alt={`File preview`}
          className="w-full h-full object-cover"
          onError={() => setPreviewError(true)}
        />
      ) : fileType === 'video' ? (
        <div className="relative w-full h-full bg-gray-100">
          <div 
            className="absolute inset-0 flex items-center justify-center"
            aria-label="Video preview"
          >
            <div 
              className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-sm"
              role="presentation"
            >
              <div className="w-0 h-0 border-l-[6px] border-l-black border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5" />
            </div>
          </div>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-black/10 py-0.5"
            role="presentation"
          >
            <span className="text-[8px] font-medium text-white text-center block">VIDEO</span>
          </div>
        </div>
      ) : (
        <div 
          className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-1"
          role="presentation"
        >
          {fileType === 'pdf' ? (
            <>
              <FileText className="w-6 h-6 text-red-500" aria-hidden="true" />
              <span className="text-[8px] font-medium text-gray-500">PDF</span>
            </>
          ) : fileType === 'doc' ? (
            <>
              <FileText className="w-6 h-6 text-blue-500" aria-hidden="true" />
              <span className="text-[8px] font-medium text-gray-500">DOC</span>
            </>
          ) : (
            <>
              <FileText className="w-6 h-6 text-gray-500" aria-hidden="true" />
              <span className="text-[8px] font-medium text-gray-500">FILE</span>
            </>
          )}
        </div>
      )}
      <div 
        className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200"
        role="presentation"
      />
    </div>
  );
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setIsAdmin(userDoc.data().role === "admin");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Debug logs
  useEffect(() => {
    console.log("Current user:", user);
    console.log("User email:", user?.email);
    console.log("Is admin?", isAdmin);
  }, [user, isAdmin]);

  useEffect(() => {
    const jobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Raw job data with attachments:', data.attachments);

        // Extract client info from description
        let clientName = '';
        let clientAddress = '';
        let clientPhone = '';
        let jobDescription = '';
        let title = '';
        let currentSection = '';
        
        if (data.description) {
          const lines = data.description.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Check for section headers (both ### and ** style)
            if (line.startsWith('### ') || line.startsWith('**')) {
              const sectionMatch = line.match(/(?:###\s*|\*\*)(.*?)(?:\*\*)?$/);
              if (sectionMatch) {
                currentSection = sectionMatch[1].trim();
                continue;
              }
            }

            switch (currentSection) {
              case 'Job Title':
                if (!title) {
                  title = line.replace(/^[-*•]/, '').trim();
                }
                break;
              case 'Client Details':
                // Clean up the line from markdown and special characters
                const cleanLine = line
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
                  } else if ((normalizedLabel.includes('phone') || normalizedLabel.includes('contact')) && !clientPhone && value.includes('07')) {
                    clientPhone = value.trim();
                  } else if (normalizedLabel.includes('address') && !clientAddress) {
                    clientAddress = value.trim();
                  }
                }
                break;
              case 'Job Description':
                jobDescription += line + '\n';
                break;
            }
          }
        }

        return {
          id: doc.id,
          title: title || data.title || 'Untitled Job',
          clientName: clientName || data.clientName || 'No Client',
          clientAddress: clientAddress || data.clientAddress || 'No Address',
          clientPhone: clientPhone || data.clientPhone || 'No Phone',
          status: data.status || 'new',
          startTime: data.startTime || null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
          description: jobDescription.trim() || data.description || '',
          assignedTo: data.assignedTo || '',
          feedback: data.feedback || '',
          attachments: Array.isArray(data.attachments) ? data.attachments : [],
        } as Job;
      });

      // Filter jobs based on user role
      const filteredJobs = isAdmin 
        ? jobsData 
        : jobsData.filter(job => job.assignedTo === user?.email);
      
      setJobs(filteredJobs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, user?.email]);

  const columns = [
    {
      id: "expander",
      header: () => null,
      cell: ({ row }: { row: Row<Job> }) => {
        if (!row.original.description) return null;
        return (
          <Button
            className="h-7 w-7 p-0 shadow-none text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            aria-expanded={row.getIsExpanded()}
            aria-label={row.getIsExpanded() ? "Hide details" : "Show details"}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                row.getIsExpanded() && "rotate-90"
              )}
            />
          </Button>
        );
      },
    },
    {
      header: "Job Title",
      accessorKey: "title",
      cell: ({ row }: { row: Row<Job> }) => (
        <div className="font-medium">{row.original.title || 'Untitled Job'}</div>
      ),
    },
    {
      header: "Attachments",
      id: "attachments",
      cell: ({ row }: { row: Row<Job> }) => {
        const attachments = row.original.attachments || [];
        
        if (!attachments?.length) return null;

        return (
          <div className="flex gap-2">
            {attachments.slice(0, 3).map((url) => (
              <div
                key={url}
                onClick={(e) => {
                  e.stopPropagation();
                  const fileType = getFileType(url);
                  // Open preview for images, videos, PDFs, and docs
                  if (['image', 'video', 'pdf', 'doc'].includes(fileType)) {
                    setSelectedImage(url);
                  } else {
                    window.open(url, '_blank');
                  }
                }}
              >
                <FilePreview url={url} />
              </div>
            ))}
            {attachments.length > 3 && (
              <div className="w-12 h-12 rounded border overflow-hidden bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                +{attachments.length - 3}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Client",
      accessorKey: "clientName",
      cell: ({ row }: { row: Row<Job> }) => (
        <div>
          <div className="font-medium">{row.original.clientName || 'No Client'}</div>
          <div className="text-sm text-gray-500">{row.original.clientAddress || 'No Address'}</div>
        </div>
      ),
    },
    {
      header: "Phone",
      accessorKey: "clientPhone",
      cell: ({ row }: { row: Row<Job> }) => (
        <div className="font-medium">{row.original.clientPhone || 'No Phone'}</div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }: { row: Row<Job> }) => (
        <div className="flex items-center">
          <span className={cn(
            "rounded-full w-2 h-2 mr-2",
            row.original.status === "completed" && "bg-green-500",
            row.original.status === "in-progress" && "bg-yellow-500",
            row.original.status === "pending" && "bg-gray-500"
          )} />
          <span className="capitalize">{row.original.status || 'pending'}</span>
        </div>
      ),
    },
    {
      header: "Start Time",
      accessorKey: "startTime",
      cell: ({ row }: { row: Row<Job> }) => {
        const startTime = row.original.startTime;
        if (!startTime) return <div>Not set</div>;
        
        const formatDate = (date: Date) => {
          const options: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          };
          return date.toLocaleString('en-GB', options).replace(',', '');
        };
        
        // If startTime is a Firestore Timestamp
        if (startTime instanceof Timestamp) {
          return <div>{formatDate(startTime.toDate())}</div>;
        }
        
        // If startTime is a Date
        if (startTime instanceof Date) {
          return <div>{formatDate(startTime)}</div>;
        }
        
        // If startTime is a string (assuming ISO format)
        if (typeof startTime === 'string') {
          const date = new Date(startTime);
          if (!isNaN(date.getTime())) {
            return <div>{formatDate(date)}</div>;
          }
        }
        
        return <div>Invalid date</div>;
      },
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: ({ row }: { row: Row<Job> }) => {
        const createdAt = row.original.createdAt;
        if (!createdAt) return <div>N/A</div>;
        
        if (createdAt instanceof Timestamp) {
          return <div>{createdAt.toDate().toLocaleDateString()}</div>;
        }
        
        return <div>N/A</div>;
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }: { row: Row<Job> }) => {
        const handleDelete = async (e: React.MouseEvent) => {
          e.stopPropagation();
          if (!confirm("Are you sure you want to delete this job?")) return;
          
          try {
            await deleteDoc(doc(db, "jobs", row.original.id));
          } catch (err) {
            console.error("Error deleting job:", err);
            alert("Failed to delete job");
          }
        };

        const handleStatusUpdate = async (e: React.MouseEvent, newStatus: string) => {
          e.stopPropagation();
          try {
            const jobRef = doc(db, "jobs", row.original.id);
            
            if (newStatus === 'completed') {
              const feedback = prompt('Please provide feedback about the job completion:');
              if (feedback === null) return; // User cancelled the prompt
              
              await updateDoc(jobRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
                feedback: feedback
              });
            } else {
              await updateDoc(jobRef, {
                status: newStatus,
                updatedAt: serverTimestamp()
              });
            }
          } catch (err) {
            console.error("Error updating job status:", err);
            alert("Failed to update job status");
          }
        };

        // Show different actions based on user role and job status
        if (isAdmin) {
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-900 hover:bg-red-50"
                onClick={handleDelete}
                title="Delete job"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete job</span>
              </Button>
            </div>
          );
        }

        // Employee actions
        if (user && row.original.assignedTo === user.email) {
          switch (row.original.status) {
            case 'new':
              return (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-900"
                    onClick={(e) => handleStatusUpdate(e, 'in-progress')}
                  >
                    Accept Job
                  </Button>
                </div>
              );
            case 'in-progress':
              return (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-600 hover:text-green-900"
                    onClick={(e) => handleStatusUpdate(e, 'completed')}
                  >
                    Complete Job
                  </Button>
                </div>
              );
            default:
              return null;
          }
        }

        return null;
      },
    },
  ];

  const table = useReactTable({
    data: jobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          {isAdmin ? "All Jobs" : "My Assigned Jobs"}
        </h1>
        {isAdmin && (
          <Link href="/jobs/new">
            <Button>Create New Job</Button>
          </Link>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-gray-800"
                    onClick={(e) => {
                      // Only navigate if not clicking the expand button
                      if (!(e.target as HTMLElement).closest('button')) {
                        window.location.href = `/jobs/${row.original.id}`;
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="whitespace-nowrap [&:has([aria-expanded])]:w-px [&:has([aria-expanded])]:py-0 [&:has([aria-expanded])]:pr-0"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={row.getVisibleCells().length}>
                        <div className="flex flex-col gap-4 py-2">
                          <div className="flex items-start text-primary/80">
                            <span
                              className="me-3 mt-0.5 flex w-7 shrink-0 justify-center"
                              aria-hidden="true"
                            >
                              <Info className="opacity-60" size={16} strokeWidth={2} />
                            </span>
                            <p className="text-sm">{row.original.description}</p>
                          </div>
                          {row.original.feedback && row.original.status === 'completed' && (
                            <div className="flex items-start text-primary/80 mt-2">
                              <span
                                className="me-3 mt-0.5 flex w-7 shrink-0 justify-center"
                                aria-hidden="true"
                              >
                                <Info className="opacity-60" size={16} strokeWidth={2} />
                              </span>
                              <div>
                                <p className="text-sm font-medium mb-1">Completion Feedback:</p>
                                <p className="text-sm">{row.original.feedback}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                  No jobs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
            <DialogDescription>
              <a 
                href={selectedImage || ''} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                Open original
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full bg-black/5 rounded-lg overflow-hidden">
            {selectedImage && (() => {
              const fileType = getFileType(selectedImage);
              
              switch (fileType) {
                case 'video':
                  return (
                    <div className="aspect-video bg-black" role="presentation">
                      <video
                        key={selectedImage}
                        src={selectedImage}
                        controls
                        controlsList="nodownload"
                        className="w-full h-full"
                        autoPlay
                        playsInline
                        preload="metadata"
                        aria-label="Video preview"
                        onLoadedMetadata={(e) => {
                          const video = e.target as HTMLVideoElement;
                          console.log('Video metadata loaded:', {
                            duration: video.duration,
                            videoWidth: video.videoWidth,
                            videoHeight: video.videoHeight
                          });
                        }}
                        onError={(e) => {
                          console.error('Video error:', e);
                          const target = e.target as HTMLVideoElement;
                          console.log('Video error details:', {
                            error: target.error,
                            networkState: target.networkState,
                            readyState: target.readyState,
                            src: target.src
                          });
                        }}
                      />
                    </div>
                  );
                case 'image':
                  return (
                    <div className="aspect-video">
                      <img
                        src={selectedImage}
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
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedImage)}&embedded=true`}
                        className="w-full h-full rounded-lg"
                        frameBorder="0"
                      />
                    </div>
                  );
                default:
                  return (
                    <div className="p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Preview not available</p>
                      <a 
                        href={selectedImage} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-4 inline-block text-blue-500 hover:underline"
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