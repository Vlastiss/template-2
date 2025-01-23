"use client";

import { Fragment, useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronDown, ChevronUp, Info, Trash2 } from "lucide-react";
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
  status: string;
  startTime: string;
  createdAt: any;
  description?: string;
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
        
        if (data.description) {
          const lines = data.description.split('\n');
          let isInJobDescription = false;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Extract client details
            if (line === '### Client Details') {
              for (let j = i + 1; j < lines.length && j < i + 5; j++) {
                const infoLine = lines[j].trim();
                if (infoLine.startsWith('- **Name:**')) {
                  clientName = infoLine.replace('- **Name:**', '').trim();
                }
                if (infoLine.startsWith('- **Contact:**')) {
                  clientPhone = infoLine.replace('- **Contact:**', '').trim();
                }
                if (infoLine.startsWith('- **Address:**')) {
                  clientAddress = infoLine.replace('- **Address:**', '').trim();
                }
              }
            }
            
            // Extract job description
            if (line === '### Job Description') {
              isInJobDescription = true;
              continue;
            } else if (line.startsWith('### ')) {
              isInJobDescription = false;
            }
            
            if (isInJobDescription && line && !line.startsWith('### ')) {
              jobDescription += line + '\n';
            }
          }
        }

        // Extract title from description or use existing title
        let title = data.title || '';
        if (data.description && !title) {
          const lines = data.description.split('\n');
          for (const line of lines) {
            if (line.startsWith('### Job Title/Name')) {
              const nextLine = lines[lines.indexOf(line) + 1];
              if (nextLine) {
                title = nextLine.trim();
                break;
              }
            }
          }
        }

        return {
          id: doc.id,
          title: title || `Job ${doc.id.slice(0, 8)}`,
          clientName: clientName || 'No Client',
          clientAddress: clientAddress || 'No Address',
          clientPhone: clientPhone || 'No Phone',
          status: data.status || 'new',
          startTime: data.expectedCompletionDate || '',
          createdAt: data.createdAt,
          description: jobDescription.trim() || '',
        } as Job;
      });
      
      setJobs(jobsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const table = useReactTable({
    data: jobs,
    columns: [
      {
        id: "expander",
        header: () => null,
        cell: ({ row }: { row: Row<Job> }) => {
          // Only show expander if there's a description
          if (!row.original.description) return null;
          
          return (
            <Button
              className="h-7 w-7 p-0 shadow-none text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                row.toggleExpanded();
              }}
              aria-expanded={row.getIsExpanded()}
              aria-label={row.getIsExpanded()
                ? `Collapse details for ${row.original.title}`
                : `Expand details for ${row.original.title}`}
              variant="ghost"
            >
              {row.getIsExpanded() ? (
                <ChevronUp className="opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
              ) : (
                <ChevronDown className="opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
              )}
            </Button>
          );
        },
      },
      {
        header: "Job Title",
        accessorKey: "title",
        cell: ({ row }: { row: Row<Job> }) => (
          <div className="font-medium">
            {row.original.title || `Job ${row.original.id.slice(0, 8)}`}
          </div>
        ),
      },
      {
        header: ({ column }: { column: Column<Job> }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center space-x-1 group hover:text-gray-900"
          >
            <span>Client</span>
            <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-100" />
          </button>
        ),
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
          <div className="font-medium">
            {row.original.clientPhone || 'No Phone'}
          </div>
        ),
      },
      {
        header: ({ column }: { column: Column<Job> }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center space-x-1 group hover:text-gray-900"
          >
            <span>Status</span>
            <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-100" />
          </button>
        ),
        accessorKey: "status",
        cell: ({ row }: { row: Row<Job> }) => {
          const status = row.getValue("status") as string;
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
              {status || 'new'}
            </span>
          );
        },
      },
      {
        header: ({ column }: { column: Column<Job> }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center space-x-1 group hover:text-gray-900"
          >
            <span>Start Time</span>
            <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-100" />
          </button>
        ),
        accessorKey: "startTime",
        cell: ({ row }: { row: Row<Job> }) => (
          <div className="text-gray-500">
            {row.original.startTime ? new Date(row.original.startTime).toLocaleString() : 'Not set'}
          </div>
        ),
      },
      {
        header: ({ column }: { column: Column<Job> }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center space-x-1 group hover:text-gray-900"
          >
            <span>Created</span>
            <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-100" />
          </button>
        ),
        accessorKey: "createdAt",
        cell: ({ row }: { row: Row<Job> }) => (
          <div className="text-gray-500">
            {typeof row.original.createdAt === 'object' && row.original.createdAt?.toDate ? 
              row.original.createdAt.toDate().toLocaleString() : 
              'N/A'}
          </div>
        ),
      },
      // Only add delete column if user is admin
      ...(isAdmin ? [{
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }: { row: Row<Job> }) => {
          const handleDelete = async (e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent row click event
            if (window.confirm('Are you sure you want to delete this job?')) {
              try {
                await deleteDoc(doc(db, "jobs", row.original.id));
              } catch (error) {
                console.error("Error deleting job:", error);
                alert("Failed to delete job");
              }
            }
          };

          return (
            <div className="flex justify-end pr-4">
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
        },
      }] : []),
    ],
    getRowCanExpand: (row) => Boolean(row.original.description),
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
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
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
                        <div className="flex items-start py-2 text-primary/80">
                          <span
                            className="me-3 mt-0.5 flex w-7 shrink-0 justify-center"
                            aria-hidden="true"
                          >
                            <Info className="opacity-60" size={16} strokeWidth={2} />
                          </span>
                          <p className="text-sm">{row.original.description}</p>
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