"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ArrowLeft, Upload } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  username: string;
  photoURL: string;
  location: string;
  status: "Active" | "Inactive";
  balance: number;
  createdAt?: any;
  updatedAt?: any;
  isAdmin?: boolean;
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState<Partial<EmployeeProfile>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!params.id) {
        setError("No employee ID provided");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("You must be logged in to view employee profiles");
        setLoading(false);
        return;
      }

      try {
        const employeeDoc = await getDoc(doc(db, "users", params.id as string));
        
        if (!employeeDoc.exists()) {
          setError("Employee not found");
          setLoading(false);
          return;
        }

        const employeeData = {
          id: employeeDoc.id,
          ...employeeDoc.data()
        } as EmployeeProfile;

        // Only allow access if user is admin or viewing their own profile
        if (!isAdmin() && user.uid !== employeeData.id) {
          setError("You don't have permission to view this profile");
          setLoading(false);
          return;
        }

        setEmployee(employeeData);
        setEditedEmployee(employeeData);
        setError(null);
      } catch (error) {
        console.error("Error fetching employee:", error);
        setError("Failed to load employee profile");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [params.id, user, isAdmin]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setIsSubmitting(true);
    try {
      let photoURL = employee.photoURL;

      // Upload new image if selected
      if (selectedImage) {
        const storageRef = ref(storage, `profile-pictures/${employee.id}`);
        const uploadResult = await uploadBytes(storageRef, selectedImage);
        photoURL = await getDownloadURL(uploadResult.ref);
      }

      // Update employee document
      const employeeRef = doc(db, "users", employee.id);
      await updateDoc(employeeRef, {
        ...editedEmployee,
        photoURL,
        updatedAt: new Date(),
      });

      // Update local state
      setEmployee(prev => prev ? {
        ...prev,
        ...editedEmployee,
        photoURL,
      } : null);

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setShowEditDialog(false);
      setSelectedImage(null);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">{error}</h2>
          <Button
            className="mt-4"
            onClick={() => router.push("/employees")}
          >
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Employee not found</h2>
          <Button
            className="mt-4"
            onClick={() => router.push("/employees")}
          >
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  const getInitial = (name: string) => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  };

  const canEdit = isAdmin() || user?.uid === employee.id;

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {canEdit && (
          <Button onClick={() => setShowEditDialog(true)}>
            Edit Profile
          </Button>
        )}
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-card shadow rounded-lg overflow-hidden border border-border">
          {/* Header/Cover */}
          <div className="bg-muted h-32"></div>

          {/* Profile Info */}
          <div className="relative px-6 pb-6">
            <div className="flex flex-col items-center -mt-16">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-lg">
                {employee.photoURL ? (
                  <Image
                    src={employee.photoURL}
                    alt={`Profile picture of ${employee.name}`}
                    fill
                    priority
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-2xl text-muted-foreground">
                      {getInitial(employee.name)}
                    </span>
                  </div>
                )}
              </div>

              <h1 className="mt-4 text-2xl font-bold text-foreground">{employee.name}</h1>
              <p className="text-muted-foreground">@{employee.username || employee.email.split('@')[0]}</p>

              <div className="mt-2 flex gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  employee.status === "Active" 
                    ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {employee.status}
                </span>
                {employee.isAdmin && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                <p className="mt-1 text-foreground">{employee.email}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                <p className="mt-1 text-foreground">{employee.location || "Not specified"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Balance</h3>
                <p className={`mt-1 ${employee.balance < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(employee.balance)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Member Since</h3>
                <p className="mt-1 text-foreground">
                  {employee.createdAt?.toDate?.()
                    ? new Date(employee.createdAt.toDate()).toLocaleDateString()
                    : "Not available"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile information below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={editedEmployee.name || ''}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="username"
                  name="username"
                  value={editedEmployee.username || ''}
                  onChange={handleInputChange}
                  placeholder="johndoe"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium">
                  Location
                </label>
                <Input
                  id="location"
                  name="location"
                  value={editedEmployee.location || ''}
                  onChange={handleInputChange}
                  placeholder="New York, NY"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="photo" className="text-sm font-medium">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  <Input
                    id="photo"
                    name="photo"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo')?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {selectedImage ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {selectedImage && (
                    <span className="text-sm text-gray-500">
                      {selectedImage.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 