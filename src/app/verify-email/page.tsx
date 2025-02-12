"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { applyActionCode, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

export default function VerifyEmail() {
  const [status, setStatus] = useState<'waiting' | 'verifying' | 'success' | 'error'>('waiting');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get('oobCode');
    const mode = urlParams.get('mode');
    const redirect = urlParams.get('redirect');

    const verifyEmail = async () => {
      if (!oobCode || mode !== 'verifyEmail') return;

      setStatus('verifying');
      try {
        await applyActionCode(auth, oobCode);
        setStatus('success');
        
        // Wait for a short time to ensure auth state is updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update user document if user is available
        if (user) {
          const userRef = doc(db, "users", user.uid);
          await setDoc(userRef, { emailVerified: true }, { merge: true });
        }

        // Redirect to create-profile
        router.push('/create-profile');
      } catch (error) {
        console.error('Error verifying email:', error);
        setStatus('error');
      }
    };

    if (oobCode) {
      verifyEmail();
    }
  }, [router, user]);

  useEffect(() => {
    if (countdown > 0 && resendDisabled) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setResendDisabled(false);
      setCountdown(60);
    }
  }, [countdown, resendDisabled]);

  const handleResendEmail = async () => {
    if (!user || resendDisabled) return;

    try {
      setError(null);
      const actionCodeSettings = {
        url: `${window.location.origin}/create-profile`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(user, actionCodeSettings);
      setResendDisabled(true);
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      if (error?.code === 'auth/too-many-requests') {
        setError('Too many verification emails sent. Please wait a while before trying again.');
        setResendDisabled(true);
        setCountdown(300);
      } else {
        setError('Failed to send verification email. Please try again later.');
      }
    }
  };

  if (status === 'waiting' && user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Check Your Email</h2>
            <p className="mt-2">We&apos;ve sent a verification link to {user.email}</p>
            <p className="mt-4 text-sm text-gray-600">
              Click the link in the email to verify your account. If you don&apos;t see it, check your spam folder.
            </p>
            <Button
              onClick={handleResendEmail}
              disabled={resendDisabled}
              className="mt-6"
              variant="outline"
            >
              {resendDisabled ? `Resend in ${countdown}s` : 'Resend verification email'}
            </Button>
            {error && (
              <p className="mt-4 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        {status === 'verifying' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold">Verifying your email...</h2>
            <p className="mt-2">Please wait while we verify your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-600">Email Verified!</h2>
            <p className="mt-2">Your email has been successfully verified.</p>
            <p className="mt-2">Redirecting to create profile...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Verification Failed</h2>
            <p className="mt-2">We couldn&apos;t verify your email address.</p>
            <p className="mt-2">Please try again or contact support if the problem persists.</p>
          </div>
        )}
      </div>
    </div>
  );
} 