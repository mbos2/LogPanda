"use client";

import {
  createContext,
  JSX,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAuthCookiesSnapshot,
  refreshSession,
  signOut,
} from "@lib/auth/auth-service";
import { clearAuthCookies } from "@lib/auth/cookies";
import {
  isJwtExpired,
  isJwtValid,
  parseJwt,
} from "@lib/auth/jwt";
import { JwtPayload } from "./types";

export interface AuthContextValue {
  user: JwtPayload | null;
  isAuthenticated: boolean;
  isReady: boolean;
  refreshAuth: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  const applyCurrentSession = useCallback((): void => {
    const { jwt } = getAuthCookiesSnapshot();

    if (!jwt || !isJwtValid(jwt)) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }

    const payload: JwtPayload | null = parseJwt(jwt);

    setUser(payload);
    setIsAuthenticated(true);
  }, []);

  const refreshAuth = useCallback(async (): Promise<void> => {
    const { jwt, refreshToken } = getAuthCookiesSnapshot();

    if (!jwt && !refreshToken) {
      clearAuthCookies();
      setUser(null);
      setIsAuthenticated(false);
      setIsReady(true);
      return;
    }

    if (jwt && isJwtValid(jwt) && !isJwtExpired(jwt)) {
      applyCurrentSession();
      setIsReady(true);
      return;
    }

    if (!refreshToken) {
      clearAuthCookies();
      setUser(null);
      setIsAuthenticated(false);
      setIsReady(true);
      return;
    }

    try {
      await refreshSession();
      applyCurrentSession();
    } catch {
      clearAuthCookies();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsReady(true);
    }
  }, [applyCurrentSession]);

  const signOutUser = useCallback(async (): Promise<void> => {
    try {
      await signOut();
    } finally {
      clearAuthCookies();
      setUser(null);
      setIsAuthenticated(false);
      setIsReady(true);
    }
  }, []);

  useEffect((): void => {
    void refreshAuth();
  }, [refreshAuth]);

  const value: AuthContextValue = useMemo(
    (): AuthContextValue => ({
      user,
      isAuthenticated,
      isReady,
      refreshAuth,
      signOutUser,
    }),
    [user, isAuthenticated, isReady, refreshAuth, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context: AuthContextValue | null = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};