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
  enhancedDescription?: string;
  status: string;
  assignedTo: string;
  startTime: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientEmail: string;
  attachments: File[];
  jobTitle?: string;
  jobDescription?: string;
  timeline?: {
    startDate: string | null;
    completionDate: string | null;
    estimatedDuration: string;
  };
  requiredTools?: string[];
  instructions?: string[];
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
  clientEmail: "",
  attachments: []
};

const extractClientInfo = (rawDescription: string) => {
  const lines = rawDescription.split('\n');
  let clientInfo = {
    name: '',
    email: '',
    phone: '',
    address: '',
  };
  let requirements: string[] = [];
  let isInRequirements = false;
  let currentSection = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for section headers
    if (trimmedLine.toLowerCase().includes('your name:')) {
      currentSection = 'name';
      clientInfo.name = lines[lines.indexOf(line) + 1]?.trim() || '';
      continue;
    }
    if (trimmedLine.toLowerCase().includes('your e-mail:')) {
      currentSection = 'email';
      clientInfo.email = lines[lines.indexOf(line) + 1]?.trim() || '';
      continue;
    }
    if (trimmedLine.toLowerCase().includes('your phone:')) {
      currentSection = 'phone';
      clientInfo.phone = lines[lines.indexOf(line) + 1]?.trim() || '';
      continue;
    }
    if (trimmedLine.toLowerCase().includes('your address:')) {
      currentSection = 'address';
      clientInfo.address = lines[lines.indexOf(line) + 1]?.trim() || '';
      continue;
    }

    // Start capturing requirements
    if (trimmedLine.toLowerCase().includes('please specify your requirements here:') ||
        trimmedLine.toLowerCase().includes('please can you help with:')) {
      isInRequirements = true;
      currentSection = 'requirements';
      continue;
    }

    // Capture requirement lines
    if (isInRequirements && 
        !trimmedLine.toLowerCase().includes('your e-mail:') &&
        !trimmedLine.toLowerCase().includes('your address:') &&
        !trimmedLine.toLowerCase().includes('your phone:') &&
        !trimmedLine.startsWith('Your ')) {
      requirements.push(trimmedLine);
    }
  }

  // Format requirements into a proper description
  const description = requirements
    .filter(req => req.length > 0)
    .join('\n');

  return {
    clientInfo,
    description: description.trim()
  };
};

const formatJobDescription = (description: unknown): string => {
  // Ensure we have a string to work with
  if (!description || typeof description !== 'string') {
    return '';
  }

  // Split into lines and clean up
  const lines = description.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Convert to bullet points if not already
  return lines
    .map(line => line.startsWith('•') ? line : `• ${line}`)
    .join('\n');
};

export default function NewJobPage() {
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
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

  const handleChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'description') {
      // First update the raw input value immediately
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));

      // Then process the client info
      const { clientInfo, description } = extractClientInfo(value);
      
      // Update the form with extracted information
      setFormData(prev => ({
        ...prev,
        clientName: clientInfo.name || prev.clientName,
        clientPhone: clientInfo.phone || prev.clientPhone,
        clientEmail: clientInfo.email || prev.clientEmail,
        clientAddress: clientInfo.address || prev.clientAddress,
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Prevent the default paste behavior
    e.preventDefault();
    
    const pastedText = e.clipboardData.getData('text');
    const { name, selectionStart, selectionEnd } = e.currentTarget;
    
    if (name === 'description') {
      // Get the current text and cursor position
      const currentText = formData.description;
      const beforePaste = currentText.substring(0, selectionStart || 0);
      const afterPaste = currentText.substring(selectionEnd || 0);
      
      // Combine the text with the pasted content
      const newText = beforePaste + pastedText + afterPaste;
      
      // Update form with the combined text
      setFormData(prev => ({
        ...prev,
        description: newText
      }));

      // Process client info
      const { clientInfo } = extractClientInfo(newText);
      
      // Update the form with extracted information
      setFormData(prev => ({
        ...prev,
        clientName: clientInfo.name || prev.clientName,
        clientPhone: clientInfo.phone || prev.clientPhone,
        clientEmail: clientInfo.email || prev.clientEmail,
        clientAddress: clientInfo.address || prev.clientAddress,
      }));
    }
  };

  const handleFileUpload = (newFiles: File[]) => {
    // Check if adding these files would exceed the limit
    if (formData.attachments.length + newFiles.length > 5) {
      toast({
        title: "Too many files",
        description: "Maximum 5 files allowed",
        variant: "destructive",
      });
      return;
    }

    // Add new files to attachments
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newFiles]
    }));
  };

  const handleFileRemove = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create jobs",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setError("");

    // Show a loading toast and redirect immediately
    toast({
      title: "Creating job...",
      description: "Your job is being created in the background",
    });

    // Redirect to jobs page immediately with query parameter
    router.push('/jobs?creating=true');

    try {
      // Update progress - Starting
      window.localStorage.setItem('jobUploadProgress', '10');

      // First get the enhanced description and data from OpenAI
      const response = await fetch('/api/openai/enhance-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: formData.description
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enhance job description');
      }

      // Update progress - Got OpenAI response
      window.localStorage.setItem('jobUploadProgress', '40');

      const enhancedData = await response.json();
      
      if (!enhancedData.result) {
        throw new Error('Invalid response from OpenAI');
      }

      const enhancedResult = enhancedData.result;

      // Update progress - Processing attachments
      window.localStorage.setItem('jobUploadProgress', '60');

      // Upload attachments
      const uploadPromises = formData.attachments.map(async (file) => {
        const fileRef = storageRef(storage, `jobs/${file.name}`);
        await uploadBytes(fileRef, file);
        return getDownloadURL(fileRef);
      });

      const attachmentUrls = await Promise.all(uploadPromises);

      // Update progress - Attachments uploaded
      window.localStorage.setItem('jobUploadProgress', '80');

      // Create the job document with enhanced data
      const jobData = {
        title: enhancedResult.jobTitle.length > 50 
          ? enhancedResult.jobTitle.substring(0, 47) + '...'
          : enhancedResult.jobTitle,
        description: [
          enhancedResult.jobDescription,
          '',
          `**Tools:**`,
          enhancedResult.requiredTools.map((tool: string) => `• ${tool}`).join('\n'),
          '',
          `**Steps:**`,
          enhancedResult.instructions.map((instruction: string, index: number) => 
            `${index + 1}. ${instruction.trim()}`
          ).join('\n')
        ].join('\n'),
        originalDescription: formData.description,
        status: formData.status,
        assignedTo: formData.assignedTo || null,
        startTime: formData.startTime ? new Date(formData.startTime) : null,
        clientName: enhancedResult.clientName,
        clientPhone: enhancedResult.clientPhone,
        clientEmail: enhancedResult.clientEmail,
        clientAddress: enhancedResult.clientAddress,
        timeline: enhancedResult.timeline,
        requiredTools: enhancedResult.requiredTools,
        instructions: enhancedResult.instructions,
        attachments: attachmentUrls,
        createdAt: serverTimestamp(),
        createdBy: user.email,
        feedback: '',
        feedbackAttachments: []
      };

      await addDoc(collection(db, "jobs"), jobData);

      // Update progress - Complete
      window.localStorage.setItem('jobUploadProgress', '100');

      // Show success toast after job is created
      toast({
        title: "Success",
        description: "Job created successfully",
      });
    } catch (err) {
      console.error('Error creating job:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create job';
      // Show error toast
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Reset progress on error
      window.localStorage.removeItem('jobUploadProgress');
    } finally {
      setIsSubmitting(false);
    }
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
                onPaste={handlePaste}
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
                {formData.attachments.map((attachment, index) => (
                  <div key={`attachment-${index}`} className="relative">
                    <FileUpload
                      uniqueId={`file-${index}`}
                      existingFile={attachment}
                      onFileChange={(newFile) => {
                        if (!newFile) {
                          handleFileRemove(index);
                        } else {
                          const newAttachments = [...formData.attachments];
                          newAttachments[index] = newFile;
                          setFormData(prev => ({
                            ...prev,
                            attachments: newAttachments
                          }));
                        }
                      }}
                      maxSizeMB={100}
                      acceptedTypes="image/*,video/*,.pdf,.doc,.docx"
                    />
                  </div>
                ))}

                {formData.attachments.length < 5 && (
                  <div className="mt-4">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        handleFileUpload(files);
                        // Clear the input
                        e.target.value = '';
                      }}
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-background hover:bg-accent transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Upload up to {5 - formData.attachments.length} more files
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
              {formData.attachments.length >= 5 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Maximum of 5 attachments reached
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