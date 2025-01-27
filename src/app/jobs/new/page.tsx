"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/firebase";
import { Upload, LoaderPinwheel } from "lucide-react";
import { enhanceJobDescription } from "@/lib/utils/openai";
import { Toast } from "@/components/ui/toast"
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

      // Extract information from enhanced description
      const lines = enhancedDescription.split('\n');
      let jobTitle = '';
      let clientName = '';
      let clientPhone = '';
      let clientAddress = '';
      let currentSection = '';
      let jobDescription = '';
      let isInJobDescription = false;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        console.log("Processing line:", trimmedLine);
        console.log("Current section:", currentSection);

        // Check for section headers
        if (trimmedLine.startsWith('### ')) {
          currentSection = trimmedLine.replace(/^###\s*/, '').replace(/:$/, '').trim();
          console.log("Found section:", currentSection);
          
          // Set flag for job description section
          if (currentSection === 'Job Description') {
            isInJobDescription = true;
          } else {
            isInJobDescription = false;
          }
          continue;
        }

        // Extract job title
        if ((currentSection === 'Job Title' || currentSection === 'Job Title/Name') && !jobTitle) {
          jobTitle = trimmedLine;
          console.log("Found job title:", jobTitle);
          continue;
        }

        // Collect job description
        if (isInJobDescription) {
          jobDescription += trimmedLine + '\n';
          console.log("Adding to job description:", trimmedLine);
          continue;
        }

        // Extract client details
        if (currentSection === 'Client Details') {
          // Clean up the line from markdown and special characters
          const cleanLine = trimmedLine
            .replace(/^\s*[-*•]\s*/, '')  // Remove list markers
            .replace(/\*\*/g, '')         // Remove bold markers
            .trim();

          console.log("Processing client detail line:", cleanLine);

          // Try to match "Name: value" format
          const labelMatch = cleanLine.match(/^([^:]+):\s*(.+)$/);
          if (labelMatch) {
            const [, label, value] = labelMatch;
            const normalizedLabel = label.toLowerCase().trim();
            
            if (normalizedLabel.includes('name')) {
              clientName = value.trim();
              console.log("Found client name:", clientName);
            } else if (normalizedLabel.includes('contact') || normalizedLabel.includes('phone')) {
              // Extract phone number - look for UK mobile format
              const phoneMatch = value.match(/\b(07\d{3}\s*\d{3}\s*\d{3})\b/);
              if (phoneMatch) {
                clientPhone = phoneMatch[1].replace(/\s+/g, ' ').trim();
                console.log("Found client phone:", clientPhone);
              }
            } else if (normalizedLabel.includes('address')) {
              clientAddress = value.trim();
              console.log("Found client address:", clientAddress);
            }
          }
        }
      }

      console.log("Final extracted data:", {
        jobTitle,
        clientName,
        clientPhone,
        clientAddress,
        jobDescription
      });

      // Create the job document
      const jobRef = await addDoc(collection(db, "jobs"), {
        title: jobTitle || "Untitled Job",
        description: enhancedDescription, // Store the full enhanced description
        jobDescription: jobDescription.trim(), // Store the extracted job description separately
        status: "new",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        startTime: formData.startTime || null,
        assignedTo: formData.assignedTo || null,
        clientName: clientName || 'No Client',
        clientPhone: clientPhone || 'No Phone',
        clientAddress: clientAddress || 'No Address',
        attachments: uploadedUrls,
      });

      router.push(`/jobs/${jobRef.id}`);
    } catch (err) {
      console.error("Error creating job:", err);
      setError(err instanceof Error ? err.message : "Failed to create job");
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