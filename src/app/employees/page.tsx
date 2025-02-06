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
import { 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  getAuth,
  signOut,
} from "firebase/auth";
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
import { Trash2 } from "lucide-react";

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
  const { user, isAdmin: isAdminFn } = useAuth();
  const [showNewEmployeeDialog, setShowNewEmployeeDialog] = useState(false);
  const [newEmployee, setNewEmployee] = useState<NewEmployee>({
    name: "",
    email: "",
    location: "",
    username: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (isAdminFn) {
        const adminStatus = await isAdminFn();
        setIsAdmin(adminStatus);
      }
    };
    checkAdmin();
  }, [isAdminFn]);

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

    if (!user || !isAdmin) {
      toast({
        title: "Error",
        description: "You don't have permission to add employees",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate a more reliable temporary password that meets Firebase requirements
      const numbers = '0123456789';
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const special = '!@#$%^&*';
      
      const getRandomChar = (str: string) => str.charAt(Math.floor(Math.random() * str.length));
      
      const tempPassword = [
        getRandomChar(lowercase),
        getRandomChar(uppercase),
        getRandomChar(numbers),
        getRandomChar(special),
        ...Array(4).fill(null).map(() => getRandomChar(lowercase + uppercase + numbers))
      ].sort(() => Math.random() - 0.5).join('');
      
      // Create user through Firebase Admin API
      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newEmployee.email,
          password: tempPassword,
          displayName: newEmployee.name,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 400 && responseData.error === 'User with this email already exists') {
          toast({
            title: "Error",
            description: "An employee with this email already exists. Please use a different email address.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(responseData.error || 'Failed to create user');
      }

      const { uid } = responseData;

      // Create the user document in Firestore
      const employeeData = {
        name: newEmployee.name,
        email: newEmployee.email,
        username: newEmployee.username || newEmployee.email.split('@')[0],
        location: newEmployee.location || '',
        status: "Active",
        photoURL: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isAdmin: false,
        uid: uid,
      };

      // Add the document to Firestore using the auth UID
      await setDoc(doc(db, "users", uid), employeeData);
      
      // Send welcome email
      const emailResponse = await fetch('/api/auth/send-welcome-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newEmployee.email,
          name: newEmployee.name,
          password: tempPassword
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Failed to send welcome email');
      }
      
      toast({
        title: "Success",
        description: "Employee added successfully. Welcome email sent with login details.",
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

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!user || !isAdmin) {
      toast({
        title: "Error",
        description: "You don't have permission to delete employees",
        variant: "destructive",
      });
      return;
    }

    // Don't allow deleting yourself
    if (employee.id === user.uid) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/auth/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: employee.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Delete error:', data);
        throw new Error(data.error || 'Failed to delete user');
      }

      // Update local state only after successful deletion
      setEmployees(prev => prev.filter(emp => emp.id !== employee.id));

      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employees</h1>
        {isAdmin && (
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
              {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
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
                {isAdmin && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
                          handleDeleteEmployee(employee);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
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