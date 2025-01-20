"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "./ui/button";
import { UserCircle, LogOut } from "lucide-react";

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="font-bold text-xl text-gray-800">
            Handyman Jobs
          </Link>

          <div className="flex items-center gap-6">
            {user ? (
              <>
                <Link href="/jobs" className="text-gray-600 hover:text-gray-900">
                  Jobs
                </Link>
                {user.email?.includes("admin") && (
                  <Link href="/employees" className="text-gray-600 hover:text-gray-900">
                    Employees
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5" />
                  <span className="text-sm text-gray-600">{user.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm">
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