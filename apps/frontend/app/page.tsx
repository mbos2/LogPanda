"use client";

import { JSX, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@lib/auth/auth-context";
import GlobalLoader from "@components/global-loader";

export default function HomePage(): JSX.Element | null{
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();

  useEffect((): void => {
    if (!isReady) {
      return;
    }

    if (isAuthenticated) {
      router.replace("/dashboard");
      return;
    }

    router.replace("/sign-in");
  }, [isAuthenticated, isReady, router]);

  if (!isReady) {
    return <GlobalLoader />;
  }
  
  return null;
}