"use client";

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p>Welcome {user?.email}</p>
      </div>
    </ProtectedRoute>
  );
} 