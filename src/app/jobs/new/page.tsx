"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Wand2 } from "lucide-react";
import { enhanceJobDescription } from "@/lib/utils/openai";

interface JobFormData {
  description: string;
  status: string;
}

const initialFormData: JobFormData = {
  description: "",
  status: "new"
};

export default function NewJobPage() {
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isFormatted, setIsFormatted] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const jobsRef = collection(db, "jobs");
      await addDoc(jobsRef, {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      router.push("/jobs");
    } catch (err) {
      setError("Failed to create job. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
        setFormData(prev => ({
          ...prev,
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
          <textarea
            name="description"
            id="description"
            rows={12}
            placeholder="Insert data from email"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-4 text-gray-900 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
          
          {error && (
            <div className="mt-2 text-red-600 text-sm text-center">{error}</div>
          )}

          <div className="mt-4 flex justify-end">
            {!isFormatted ? (
              <Button
                type="button"
                onClick={handleEnhanceDescription}
                disabled={isEnhancing || !formData.description.trim()}
                className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2"
              >
                {isEnhancing ? (
                  "Formatting..."
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Format Job
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-green-600 text-white hover:bg-green-700 rounded-lg"
              >
                {isSubmitting ? "Uploading..." : "Upload Job"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
} 