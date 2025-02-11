"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { sendEmailVerification } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const checkVerification = async () => {
      await user.reload();
      if (user.emailVerified) {
        // Update user document
        await updateDoc(doc(db, "users", user.uid), {
          emailVerified: true,
          updatedAt: new Date().toISOString()
        });
        router.push("/complete-form");
      }
    };

    // Check immediately
    checkVerification();

    // Then check every 5 seconds
    const interval = setInterval(checkVerification, 5000);

    return () => clearInterval(interval);
  }, [user, router]);

  useEffect(() => {
    if (countdown > 0 && loading) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setLoading(false);
      setCountdown(60);
    }
  }, [countdown, loading]);

  const handleResendEmail = async () => {
    if (!user || loading) return;

    setLoading(true);
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true
      });
      toast({
        title: "Email Sent",
        description: "Verification email has been resent. Please check your inbox.",
      });
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      setCountdown(0);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="mt-2 text-gray-600">
            We&apos;ve sent a verification email to{" "}
            <span className="font-medium">{user.email}</span>
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Please click the link in the email to verify your account. If you don&apos;t see the email, check your spam folder.
          </p>

          <Button
            onClick={handleResendEmail}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading
              ? `Resend email in ${countdown}s`
              : "Resend verification email"}
          </Button>

          <p className="text-xs text-gray-500">
            Once verified, you&apos;ll be automatically redirected to complete your profile.
          </p>
        </div>
      </div>
    </div>
  );
} 