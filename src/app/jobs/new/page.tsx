"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase/firebase";
import { Upload, LoaderPinwheel } from "lucide-react";
import { enhanceJobDescription } from "@/lib/utils/openai";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "@/components/FileUpload";
import { useAuth } from "@/lib/hooks/useAuth";

interface JobFormData {
  title: string;
  description: string;
  status: string;
  assignedTo: string;
  startTime: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  attachments: File[];
}

interface User {
  email: string;
  id: string;
}

const initialFormData: JobFormData = {
  title: "",
  description: "",
  status: "new",
  assignedTo: "",
  startTime: "",
  clientName: "",
  clientPhone: "",
  clientAddress: "",
  attachments: []
};

export default function NewJobPage() {
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        router.push('/');
        return;
      }
      
      try {
        const tokenResult = await user.getIdTokenResult(true);
        const hasAdminRole = tokenResult.claims.role === 'admin';
        setIsAdmin(hasAdminRole);
        
        if (!hasAdminRole) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to create jobs",
            variant: "destructive",
          });
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        toast({
          title: "Authentication Error",
          description: "Please try logging in again",
          variant: "destructive",
        });
        router.push('/');
      }
    };

    checkAdminStatus();
  }, [user, router, toast]);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAdmin) return;
      
      try {
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to load users list",
          variant: "destructive",
        });
      }
    };

    fetchUsers();
  }, [isAdmin, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create jobs",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      setError("Please enter job details first");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Get fresh token before upload
      await auth.currentUser?.getIdToken(true);
      
      // Upload attachments
      const uploadedUrls: string[] = [];
      if (formData.attachments.length > 0) {
        for (const file of formData.attachments) {
          const fileRef = storageRef(storage, `jobs/${Date.now()}-${file.name}`);
          try {
            const snapshot = await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            uploadedUrls.push(downloadUrl);
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError);
            throw new Error('Failed to upload attachments');
          }
        }
      }

      // Show loading toast
      toast({
        title: "Creating job...",
        description: "Your job is being created in the background",
      });

      // Get enhanced description from OpenAI
      let enhancedData = null;
      try {
        const enhancedDescription = await enhanceJobDescription(formData.description);
        if (enhancedDescription) {
          enhancedData = JSON.parse(enhancedDescription);
        }
      } catch (aiError) {
        console.error('Error enhancing description:', aiError);
        // Continue without AI enhancement
      }

      // Create the job document
      const jobData = {
        title: enhancedData?.jobTitle || formData.title || 'Untitled Job',
        description: formData.description,
        enhancedDescription: enhancedData?.fullDescription || formData.description,
        jobDescription: enhancedData?.jobDescription || '',
        status: "new",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.email,
        startTime: formData.startTime || null,
        assignedTo: formData.assignedTo || null,
        clientName: enhancedData?.clientName || formData.clientName || 'No Client',
        clientPhone: enhancedData?.clientPhone || formData.clientPhone || 'No Phone',
        clientEmail: enhancedData?.clientEmail || '',
        clientAddress: enhancedData?.clientAddress || formData.clientAddress || 'No Address',
        attachments: uploadedUrls,
        timeline: enhancedData?.timeline || {},
        requiredTools: enhancedData?.requiredTools || [],
        instructions: enhancedData?.instructions || [],
        estimatedDuration: enhancedData?.estimatedDuration || null,
      };

      // Create the job
      await addDoc(collection(db, "jobs"), jobData);

      // Show success toast
      toast({
        title: "Success",
        description: "Job created successfully",
      });

      // Redirect to jobs page
      router.push('/jobs');
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create job",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Convert FileList to Array and update form data
    const fileArray = Array.from(files);
    setFormData(prev => ({
      ...prev,
      attachments: fileArray
    }));
  };

  // Only render the form if user is admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-background p-6 rounded-lg shadow-sm border border-border">
          <div className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Customer message
              </label>
              <textarea
                name="description"
                id="description"
                rows={20}
                placeholder="Insert data from email"
                value={formData.description}
                onChange={handleChange}
                className="w-full p-4 bg-background border-input rounded-lg focus:ring-ring focus:border-ring"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="assignedTo" className="block text-sm font-medium mb-1">
                  Assign To
                </label>
                <select
                  name="assignedTo"
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  className="w-full p-2 bg-background border-input rounded-lg focus:ring-ring focus:border-ring"
                >
                  <option value="">Select User</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="startTime" className="block text-sm font-medium mb-1">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  id="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full p-2 bg-background border-input rounded-lg focus:ring-ring focus:border-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Attachments
              </label>
              <div className="space-y-4">
                {formData.attachments.map((file, index) => (
                  <FileUpload
                    key={index}
                    uniqueId={`existing-${index}`}
                    existingFile={file}
                    onFileChange={(newFile) => {
                      const newAttachments = [...formData.attachments];
                      if (newFile) {
                        newAttachments[index] = newFile;
                      } else {
                        newAttachments.splice(index, 1);
                      }
                      setFormData(prev => ({
                        ...prev,
                        attachments: newAttachments
                      }));
                    }}
                    maxSizeMB={100}
                    acceptedTypes="image/*,video/*,.pdf,.doc,.docx"
                  />
                ))}
                {formData.attachments.length < 5 && ( // Limit to 5 attachments
                  <FileUpload
                    uniqueId="new-upload"
                    onFileChange={(file) => {
                      if (file) {
                        setFormData(prev => ({
                          ...prev,
                          attachments: [...prev.attachments, file]
                        }));
                      }
                    }}
                    maxSizeMB={100}
                    acceptedTypes="image/*,video/*,.pdf,.doc,.docx"
                  />
                )}
              </div>
              {formData.attachments.length >= 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  Maximum of 5 attachments allowed
                </p>
              )}
            </div>

            {error && (
              <div className="text-destructive text-sm mt-2">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || !formData.description.trim()}
                variant="default"
                className={`flex items-center space-x-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <LoaderPinwheel className="animate-spin h-4 w-4" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>Create Job</span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
} 