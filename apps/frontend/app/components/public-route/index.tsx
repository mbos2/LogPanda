"use client";

import { JSX, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@lib/auth/auth-context";
import { Box } from "@chakra-ui/react";

export interface PublicOnlyRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

const PublicOnlyRoute = ({
  children,
  redirectTo = "/dashboard",
}: PublicOnlyRouteProps): JSX.Element | null => {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();

  useEffect((): void => {
    if (!isReady || !isAuthenticated) {
      return;
    }

    router.replace(redirectTo);
  }, [isAuthenticated, isReady, redirectTo, router]);

  if (!isReady || isAuthenticated) {
    return null;
  }

  return (
    <Box w={"full"} height={"100%"} bg={"teal.50"}>
      {children}
    </Box>
  );
};

export default PublicOnlyRoute;
