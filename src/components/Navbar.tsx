"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "./ui/button";
import { UserCircle, LogOut, PlusCircle } from "lucide-react";

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-white shadow-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="font-bold text-2xl text-gray-800">
            Handyman Jobs
          </Link>

          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <Link 
                  href="/jobs" 
                  className="text-gray-700 hover:text-gray-900 font-medium"
                >
                  Jobs
                </Link>
                {user.email?.includes("admin") && (
                  <>
                    <Link 
                      href="/employees" 
                      className="text-gray-700 hover:text-gray-900 font-medium"
                    >
                      Employees
                    </Link>
                    <Link href="/jobs/new">
                      <Button 
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm flex items-center gap-2 px-6"
                      >
                        <PlusCircle className="w-5 h-5" />
                        Create Job
                      </Button>
                    </Link>
                  </>
                )}
                <div className="flex items-center gap-2 border-l pl-6">
                  <UserCircle className="w-6 h-6 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{user.email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="flex items-center gap-2 ml-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <Link href="/login">
                <Button 
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 