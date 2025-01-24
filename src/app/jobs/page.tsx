"use client";

import { Fragment, useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDoc, Timestamp, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronDown, ChevronUp, Info, Trash2, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();

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

        // Use extracted data or fallback to root level data
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
        } as Job;
      });

      // Filter jobs based on user role
      const filteredJobs = isAdmin 
        ? jobsData // Admin sees all jobs
        : jobsData.filter(job => job.assignedTo === user?.email); // Employees see only their assigned jobs
      
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
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
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
                    className="cursor-pointer hover:bg-gray-50"
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
    </div>
  );
} 