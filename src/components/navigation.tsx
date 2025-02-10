"use client";

import {
  HomeIcon,
  Users,
  Plus,
  LogOut,
  SunMoon,
  Briefcase,
  CircleUserRound,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/navbar-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import Image from "next/image";

export function Navigation() {
  const { user, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [active, setActive] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const adminStatus = await isAdmin();
        setIsAdminUser(adminStatus);
      } else {
        setIsAdminUser(false);
      }
    };
    checkAdmin();
  }, [user, isAdmin]);

  // Hide navigation on auth-related pages
  if (pathname?.includes('/login') || pathname?.includes('/signup') || pathname?.includes('/auth')) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex h-24 items-center justify-between px-4 md:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center px-2">
        <Image 
          src="/images/logo.png" 
          alt="Work Card X Logo" 
          width={150} 
          height={75} 
          className="cursor-pointer py-3 pt-8"
          onClick={() => router.push('/')}
        />
      </div>

      {user && (
        <>
          <div className="flex-1 flex justify-center">
            <Menu setActive={setActive}>
              <MenuItem setActive={setActive} active={active} item="Jobs">
                <div className="flex flex-col space-y-4 min-w-[16rem] p-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2"
                    onClick={() => router.push("/jobs")}
                  >
                    <Briefcase className="h-5 w-5" />
                    <span>View All Cards</span>
                  </Button>
                  {isAdminUser && (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-2"
                      onClick={() => router.push("/jobs/new")}
                    >
                      <Plus className="h-5 w-5" />
                      <span>Create New Card</span>
                    </Button>
                  )}
                </div>
              </MenuItem>

              {isAdminUser && (
                <MenuItem setActive={setActive} active={active} item="Employees">
                  <div className="flex flex-col space-y-4 min-w-[16rem] p-2">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-2"
                      onClick={() => router.push("/employees")}
                    >
                      <Users className="h-5 w-5" />
                      <span>Manage Employees</span>
                    </Button>
                  </div>
                </MenuItem>
              )}
            </Menu>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative flex items-center gap-2 p-2 hover:bg-accent hover:text-accent-foreground"
                >
                  {user?.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt="Profile"
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-full"
                    />
                  ) : (
                    <CircleUserRound className="h-5 w-5" />
                  )}
                  <span className="text-sm font-medium hidden md:inline-block">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-64">
                <DropdownMenuLabel className="flex items-start gap-3">
                  {user?.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <CircleUserRound size={32} className="shrink-0 rounded-full" />
                  )}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {user?.email}
                    </span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {isAdminUser ? 'Administrator' : 'Employee'}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => router.push(`/employees/${user?.uid}`)}>
                    <CircleUserRound size={16} strokeWidth={2} className="opacity-60" />
                    <span>View Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    <SunMoon size={16} strokeWidth={2} className="opacity-60" />
                    <span>Toggle Theme</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="flex items-center gap-2 cursor-pointer" 
                  onClick={async () => {
                    try {
                      await signOut();
                      router.push('/');
                    } catch (error) {
                      console.error('Error signing out:', error);
                    }
                  }}
                >
                  <LogOut size={16} strokeWidth={2} className="opacity-60" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </nav>
  );
} 