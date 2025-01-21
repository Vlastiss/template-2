"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/firebase";
import { Wand2, Upload, LoaderPinwheel } from "lucide-react";
import { enhanceJobDescription } from "@/lib/utils/openai";

interface JobFormData {
  title: string;
  description: string;
  status: string;
  assignedTo: string;
  startTime: string;
  priority: string;
  attachments: string[];
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
  priority: "medium",
  attachments: []
};

export default function NewJobPage() {
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isFormatted, setIsFormatted] = useState(false);
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
    setError("");
    setIsSubmitting(true);

    try {
      // First, format the description
      const enhancedDescription = await enhanceJobDescription(formData.description);
      if (enhancedDescription) {
        // Extract the title from the enhanced description
        const lines = enhancedDescription.split('\n');
        let title = '';
        
        // Look for the Job Title line
        for (const line of lines) {
          if (line.toLowerCase().includes('job title') || line.toLowerCase().includes('job name')) {
            title = line.split(':')[1]?.trim() || '';
            break;
          }
        }

        // If no title was found in the formatted text, generate a simple one from the first line
        if (!title) {
          title = lines[0].replace(/^[-*•]/, '').trim();
        }

        // Ensure we have a title
        if (!title) {
          title = 'Job ' + new Date().toISOString();
        }

        // Upload files
        const uploadedUrls = await Promise.all(
          files.map(async (file) => {
            const storageRef = ref(storage, `jobs/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
          })
        );

        // Create job with enhanced description and title
        const jobsRef = collection(db, "jobs");
        const timestamp = serverTimestamp();
        await addDoc(jobsRef, {
          ...formData,
          title,
          description: enhancedDescription,
          attachments: uploadedUrls,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        
        router.push("/jobs");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create job. Please try again.");
      console.error("Job creation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleEnhanceDescription = async () => {
    if (!formData.description.trim()) {
      setError("Please enter job details first");
      return;
    }

    setIsEnhancing(true);
    setError("");

    try {
      const enhancedDescription = await enhanceJobDescription(formData.description);
      if (enhancedDescription) {
        // Extract the title from the enhanced description
        const lines = enhancedDescription.split('\n');
        let title = '';
        
        // Look for the Job Title line
        for (const line of lines) {
          if (line.toLowerCase().includes('job title') || line.toLowerCase().includes('job name')) {
            title = line.split(':')[1]?.trim() || '';
            break;
          }
        }

        // If no title was found in the formatted text, generate a simple one from the first line
        if (!title) {
          title = lines[0].replace(/^[-*•]/, '').trim();
        }

        // Ensure we have a title
        if (!title) {
          title = 'Job ' + new Date().toISOString();
        }

        setFormData(prev => ({
          ...prev,
          title,
          description: enhancedDescription
        }));
        setIsFormatted(true);
      }
    } catch (err: any) {
      setError(err.message || "Failed to format job details. Please try again.");
      console.error("Enhancement error:", err);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Customer message
              </label>
              <textarea
                name="description"
                id="description"
                rows={20}
                placeholder="Insert data from email"
                value={formData.description}
                onChange={handleChange}
                className="w-full p-4 text-gray-900  border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To
                </label>
                <select
                  name="assignedTo"
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
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
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  id="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  id="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label htmlFor="files" className="block text-sm font-medium text-gray-700 mb-1">
                  Attachments
                </label>
                <input
                  type="file"
                  id="files"
                  multiple
                  onChange={handleFileChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                {files.length > 0 && (
                  <div className="mt-2 text-sm text-gray-500">
                    {files.length} file(s) selected
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mt-2 text-red-600 text-sm text-center">{error}</div>
          )}

          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.description.trim()}
              className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 rounded-lg flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <LoaderPinwheel className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Create Job
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
} 