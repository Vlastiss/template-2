import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      if (!user) {
        if (mounted) {
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Check if user's email is in the admin list
        const isAdminEmail = ['vaclav@g.com', 'v@g.com', 'vlastis@g.com'].includes(user.email?.toLowerCase() || '');
        
        if (mounted) {
          setIsAdmin(isAdminEmail);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        if (mounted) {
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    };

    checkStatus();
    return () => {
      mounted = false;
    };
  }, [user]);

  return { isAdmin, isLoading };
} 