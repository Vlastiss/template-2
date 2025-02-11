"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    fullName: "",
    phoneNumber: "",
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!user.emailVerified) {
      router.push("/verify-email");
      return;
    }
  }, [user, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Update user document with profile information
      await updateDoc(doc(db, "users", user.uid), {
        ...formData,
        profileCompleted: true,
        updatedAt: new Date(),
      });

      // Create company document
      const companySlug = formData.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      toast({
        title: "Profile Completed",
        description: "Your profile has been successfully set up.",
      });

      // Redirect to dashboard with company name in URL
      router.push(`/${companySlug}/dashboard`);
    } catch (error: any) {
      console.error("Error completing profile:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !user.emailVerified) {
    return null;
  }

  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Complete Your Profile</h1>
          <p className="mt-2 text-gray-600">
            Please provide some additional information to complete your registration.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium">
                Company Name
              </label>
              <Input
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                required
                className="mt-1"
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium">
                Full Name
              </label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                className="mt-1"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                required
                className="mt-1"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Completing Setup..." : "Complete Setup"}
          </Button>
        </form>
      </div>
    </div>
  );
} 