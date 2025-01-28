"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/firebase";
import { Upload, LoaderPinwheel } from "lucide-react";
import { enhanceJobDescription } from "@/lib/utils/openai";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "@/components/FileUpload";

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
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);
    };

    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setError("Please enter job details first");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // First, upload any attachments
      const uploadedUrls: string[] = [];
      
      if (formData.attachments.length > 0) {
        for (const file of formData.attachments) {
          const fileRef = storageRef(storage, `jobs/${Date.now()}-${file.name}`);
          const snapshot = await uploadBytes(fileRef, file);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          uploadedUrls.push(downloadUrl);
        }
      }

      // Format the description using OpenAI
      const enhancedDescription = await enhanceJobDescription(formData.description);
      if (!enhancedDescription) {
        throw new Error("Failed to enhance job description");
      }

      console.log("Enhanced description:", enhancedDescription);

      try {
        // Parse the JSON response from OpenAI
        const parsedData = JSON.parse(enhancedDescription);
        console.log("Parsed OpenAI response:", parsedData);

        // Create the job document with the structured data
        const jobData = {
          title: parsedData.jobTitle || "Untitled Job",
          description: parsedData.fullDescription || formData.description,
          jobDescription: parsedData.jobDescription || '',
          status: "new",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          startTime: formData.startTime || null,
          assignedTo: formData.assignedTo || null,
          clientName: parsedData.clientName || 'No Client',
          clientPhone: parsedData.clientPhone || 'No Phone',
          clientEmail: parsedData.clientEmail || '',
          clientAddress: parsedData.clientAddress || 'No Address',
          attachments: uploadedUrls,
          // Additional structured fields from OpenAI
          timeline: parsedData.timeline || {},
          requiredTools: parsedData.requiredTools || [],
          instructions: parsedData.instructions || [],
          estimatedDuration: parsedData.estimatedDuration || null,
        };

        console.log("Job data before save:", jobData);
        
        const jobRef = await addDoc(collection(db, "jobs"), jobData);
        console.log("Saved job data with ID:", jobRef.id);

        // Show success toast
        toast({
          title: "Success",
          description: "Job created successfully",
          variant: "default",
          duration: 3000,
        });

        // Wait a moment before redirecting
        setTimeout(() => {
          router.push(`/jobs/${jobRef.id}`);
        }, 1000);
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        // Fallback to old parsing method if JSON parsing fails
        // ... (keep existing parsing logic as fallback)
      }
    } catch (err) {
      console.error("Error creating job:", err);
      setError(err instanceof Error ? err.message : "Failed to create job");
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to create job card",
        variant: "destructive",
        duration: 5000,
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