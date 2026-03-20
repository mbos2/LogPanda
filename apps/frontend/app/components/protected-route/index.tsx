"use client";

import { JSX, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@lib/auth/auth-context";

export interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

const ProtectedRoute = ({
  children,
  redirectTo = "/sign-in",
}: ProtectedRouteProps): JSX.Element | null => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isReady } = useAuth();

  useEffect((): void => {
    if (!isReady) {
      return;
    }

    if (isAuthenticated) {
      return;
    }

    const next: string = pathname
      ? `?next=${encodeURIComponent(pathname)}`
      : "";

    router.replace(`${redirectTo}${next}`);
  }, [isAuthenticated, isReady, pathname, redirectTo, router]);

  if (!isReady || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;