"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

interface JobFormData {
  title: string;
  clientName: string;
  clientContact: string;
  clientAddress: string;
  description: string;
  priority: string;
  expectedCompletionDate: string;
  expectedCompletionTime: string;
  requiresToolsMaterials: string;
}

const initialFormData: JobFormData = {
  title: "",
  clientName: "",
  clientContact: "",
  clientAddress: "",
  description: "",
  priority: "medium",
  expectedCompletionDate: "",
  expectedCompletionTime: "",
  requiresToolsMaterials: "",
};

export default function NewJobPage() {
  const [formData, setFormData] = useState<JobFormData>(initialFormData);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        status: "new",
      });
      router.push("/jobs");
    } catch (err) {
      setError("Failed to create job. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Job</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Job Title
          </label>
          <input
            type="text"
            name="title"
            id="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
              Client Name
            </label>
            <input
              type="text"
              name="clientName"
              id="clientName"
              required
              value={formData.clientName}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="clientContact" className="block text-sm font-medium text-gray-700">
              Client Contact
            </label>
            <input
              type="text"
              name="clientContact"
              id="clientContact"
              required
              value={formData.clientContact}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="clientAddress" className="block text-sm font-medium text-gray-700">
            Client Address
          </label>
          <input
            type="text"
            name="clientAddress"
            id="clientAddress"
            required
            value={formData.clientAddress}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Job Description
          </label>
          <textarea
            name="description"
            id="description"
            rows={4}
            required
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              name="priority"
              id="priority"
              required
              value={formData.priority}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label htmlFor="expectedCompletionDate" className="block text-sm font-medium text-gray-700">
              Expected Completion Date
            </label>
            <input
              type="date"
              name="expectedCompletionDate"
              id="expectedCompletionDate"
              required
              value={formData.expectedCompletionDate}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="expectedCompletionTime" className="block text-sm font-medium text-gray-700">
              Expected Completion Time
            </label>
            <input
              type="time"
              name="expectedCompletionTime"
              id="expectedCompletionTime"
              required
              value={formData.expectedCompletionTime}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="requiresToolsMaterials" className="block text-sm font-medium text-gray-700">
            Required Tools & Materials
          </label>
          <textarea
            name="requiresToolsMaterials"
            id="requiresToolsMaterials"
            rows={3}
            value={formData.requiresToolsMaterials}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm text-center">{error}</div>
        )}

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Job"}
          </Button>
        </div>
      </form>
    </div>
  );
} 