"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/userTable";
import { useAuth } from "@/lib/hooks/useAuth";
import { db, auth } from "@/lib/firebase/firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, where, setDoc, doc, deleteDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
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
import { useRouter } from "next/navigation";

interface Employee {
  id: string;
  name: string;
  email: string;
  username: string;
  photoURL: string;
  location: string;
  completedCards?: number;
}

interface NewEmployee {
  name: string;
  email: string;
  location: string;
  username: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { user, isAdmin } = useAuth();
  const [showNewEmployeeDialog, setShowNewEmployeeDialog] = useState(false);
  const [newEmployee, setNewEmployee] = useState<NewEmployee>({
    name: "",
    email: "",
    location: "",
    username: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const employeesCollection = collection(db, "users");
        const employeesSnapshot = await getDocs(employeesCollection);
        const employeesList = employeesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Employee[];

        // Fetch completed jobs count for each employee
        const employeesWithCompletedCards = await Promise.all(
          employeesList.map(async (employee) => {
            // Query for jobs assigned by ID
            const jobsByIdQuery = query(
              collection(db, "jobs"),
              where("assignedToId", "==", employee.id),
              where("status", "in", ["Completed", "completed", "COMPLETED"])
            );
            const jobsByIdSnapshot = await getDocs(jobsByIdQuery);

            // Query for jobs assigned by email
            const jobsByEmailQuery = query(
              collection(db, "jobs"),
              where("assignedTo", "==", employee.email),
              where("status", "in", ["Completed", "completed", "COMPLETED"])
            );
            const jobsByEmailSnapshot = await getDocs(jobsByEmailQuery);

            return {
              ...employee,
              completedCards: jobsByIdSnapshot.size + jobsByEmailSnapshot.size,
            };
          })
        );

        setEmployees(employeesWithCompletedCards);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };

    if (user) {
      fetchEmployees();
    }
  }, [user]);

  const formatBalance = (balance: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(balance);
    return balance < 0 ? formatted : formatted;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.email || !newEmployee.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!user || !isAdmin()) {
      toast({
        title: "Error",
        description: "You don't have permission to add employees",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // First create the user document in Firestore
      const employeeData = {
        ...newEmployee,
        status: "Active",
        photoURL: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isAdmin: false,
      };

      // Add the document to Firestore first
      const userDocRef = doc(collection(db, "users"));
      await setDoc(userDocRef, {
        ...employeeData,
        uid: userDocRef.id, // Use the auto-generated ID as the UID
      });

      // Then create the Firebase Auth user
      const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";
      
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          newEmployee.email,
          tempPassword
        );

        // Update the Firestore document with the auth UID if different
        if (userDocRef.id !== userCredential.user.uid) {
          await setDoc(doc(db, "users", userCredential.user.uid), {
            ...employeeData,
            uid: userCredential.user.uid,
          });
          // Delete the temporary document if needed
          try {
            await deleteDoc(doc(db, "users", userDocRef.id));
          } catch (error) {
            console.error("Error cleaning up temporary document:", error);
          }
        }

        // Send password reset email
        await sendPasswordResetEmail(auth, newEmployee.email);
      } catch (authError: any) {
        // If auth creation fails, clean up the Firestore document
        try {
          await deleteDoc(userDocRef);
        } catch (error) {
          console.error("Error cleaning up after auth failure:", error);
        }
        throw authError;
      }
      
      // Send welcome email
      const emailResponse = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: newEmployee.email,
          subject: 'Welcome to WorkCard - Your Login Details',
          html: `
            <h1>Welcome to WorkCard, ${newEmployee.name}!</h1>
            <p>Your account has been created successfully.</p>
            <p>We've sent you a separate email with a link to set up your password.</p>
            <p><strong>Please check your email and set up your password to access your account.</strong></p>
            <p>You can access the platform at: <a href="${window.location.origin}">${window.location.origin}</a></p>
            <p>If you have any questions, please contact your administrator.</p>
          `
        }),
      });

      if (!emailResponse.ok) {
        throw new Error('Failed to send welcome email');
      }
      
      toast({
        title: "Success",
        description: "Employee added successfully. Password reset email sent.",
      });
      
      // Reset form and close dialog
      setNewEmployee({
        name: "",
        email: "",
        location: "",
        username: "",
      });
      setShowNewEmployeeDialog(false);
      
      // Refresh employee list
      const employeesCollection = collection(db, "users");
      const employeesSnapshot = await getDocs(employeesCollection);
      const employeesList = employeesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Employee[];
      setEmployees(employeesList);
    } catch (error: any) {
      console.error("Error adding employee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add employee",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRowClick = (employeeId: string) => {
    router.push(`/employees/${employeeId}`);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employees</h1>
        {isAdmin() && (
          <Button onClick={() => setShowNewEmployeeDialog(true)}>
            Add New Employee
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Completed Cards</TableHead>
              <TableHead>Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow 
                key={employee.id}
                className="cursor-pointer hover:bg-gray-100/50"
                onClick={() => handleRowClick(employee.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden">
                      {employee.photoURL ? (
                        <Image
                          src={employee.photoURL}
                          alt={`Profile picture of ${employee.name}`}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{employee.name}</span>
                      <span className="text-sm text-gray-500">@{employee.username || employee.email.split('@')[0]}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {employee.completedCards || 0}
                  </span>
                </TableCell>
                <TableCell>{employee.location || "Not specified"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showNewEmployeeDialog} onOpenChange={setShowNewEmployeeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Enter the details of the new employee below.
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
                  value={newEmployee.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
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
                  value={newEmployee.username}
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
                  value={newEmployee.location}
                  onChange={handleInputChange}
                  placeholder="New York, NY"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewEmployeeDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 