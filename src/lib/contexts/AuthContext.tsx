"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "../firebase/firebase";

// Get admin emails from environment variable
const getAdminEmails = () => {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  if (!adminEmails) return [];
  return adminEmails.split(',').map(email => email.trim().toLowerCase());
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: () => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  isAdmin: async () => false,
  signInWithGoogle: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cachedAdminStatus, setCachedAdminStatus] = useState<boolean | null>(null);
  const adminCheckInProgress = React.useRef(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setCachedAdminStatus(null); // Reset cache on auth change
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in with email/password", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing up with email/password", error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  const isAdmin = async () => {
    // Return cached status if available
    if (cachedAdminStatus !== null) {
      return cachedAdminStatus;
    }

    // Prevent multiple simultaneous checks
    if (adminCheckInProgress.current) {
      return false;
    }

    adminCheckInProgress.current = true;

    try {
      if (!user?.email) {
        return false;
      }

      const userEmail = user.email.toLowerCase();
      const adminEmails = getAdminEmails();
      const isAdminUser = adminEmails.includes(userEmail);

      // Schedule state update for next tick
      Promise.resolve().then(() => {
        setCachedAdminStatus(isAdminUser);
      });

      return isAdminUser;
    } finally {
      adminCheckInProgress.current = false;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn,
      signUp,
      signOut: signOutUser,
      isAdmin,
      signInWithGoogle 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
