"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { Button } from "./ui/button";
import { UserCircle, LogOut, PlusCircle, Sun, Moon } from "lucide-react";

export default function Navbar() {
  const { user, signOut, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md border-b sticky top-0 z-50 transition-colors duration-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="font-bold text-2xl text-gray-800 dark:text-white">
            Handyman Jobs
          </Link>

          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <Link 
                  href="/jobs" 
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                >
                  Jobs
                </Link>
                {isAdmin() && (
                  <>
                    <Link 
                      href="/employees" 
                      className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                    >
                      Employees
                    </Link>
                    <Link href="/jobs/new">
                      <Button 
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm flex items-center gap-2 px-6 py-2.5 text-base"
                      >
                        <PlusCircle className="w-5 h-5" />
                        Create Job
                      </Button>
                    </Link>
                  </>
                )}
                <div className="flex items-center gap-2 border-l pl-6">
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="flex items-center gap-2 ml-4 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm px-6 py-2.5 text-base"
                >
                  Sign In
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="ml-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
} 