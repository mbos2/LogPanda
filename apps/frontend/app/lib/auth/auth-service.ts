import {
  SignInPayload,
  SignInResponse,
  SignUpPayload,
  EmptySuccessResponse,
  ConfirmSignUpPayload,
  ForgotPasswordPayload,
  ConfirmForgotPasswordPayload,
  RefreshResponse,
  RefreshPayload,
} from "./types";
import { http } from "@lib/api/http";
import {
  clearAuthCookies,
  getJwtCookie,
  getRefreshTokenCookie,
  setJwtCookie,
  setRefreshTokenCookie,
} from "@lib/auth/cookies";

export const signIn = async (
  payload: SignInPayload,
): Promise<SignInResponse> => {
  const res = await http.post<SignInResponse>("/auth/login", payload);

  if (res.data.data.AccessToken) {
    setJwtCookie(res.data.data.AccessToken);
  }

  if (res.data.data.RefreshToken) {
    setRefreshTokenCookie(res.data.data.RefreshToken);
  }

  return res.data;
};

export const signUp = async (
  payload: SignUpPayload,
): Promise<EmptySuccessResponse> => {
  const res = await http.post<EmptySuccessResponse>("/auth/register", payload);
  return res.data;
};

export const confirmSignUp = async (
  payload: ConfirmSignUpPayload,
): Promise<EmptySuccessResponse> => {
  const res = await http.post<EmptySuccessResponse>(
    "/auth/confirm-signup",
    payload,
  );
  return res.data;
};

export const forgotPassword = async (
  payload: ForgotPasswordPayload,
): Promise<EmptySuccessResponse> => {
  const res = await http.post<EmptySuccessResponse>(
    "/auth/forgot-password",
    payload,
  );
  return res.data;
};

export const confirmForgotPassword = async (
  payload: ConfirmForgotPasswordPayload,
): Promise<EmptySuccessResponse> => {
  const res = await http.post<EmptySuccessResponse>(
    "/auth/confirm-forgot-password",
    payload,
  );
  return res.data;
};

export const refreshSession = async (): Promise<RefreshResponse> => {
  const refreshToken: string | null = getRefreshTokenCookie();

  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const payload: RefreshPayload = {
    refreshToken,
  };

  const res = await http.post<RefreshResponse>("/auth/refresh", payload);

  if (res.data.data.AccessToken) {
    setJwtCookie(res.data.data.AccessToken);
  }

  if (res.data.data.RefreshToken) {
    setRefreshTokenCookie(res.data.data.RefreshToken);
  }

  return res.data;
};

export const signOut = async (): Promise<EmptySuccessResponse> => {
  const jwt: string | null = getJwtCookie();

  try {
    const res = await http.post<EmptySuccessResponse>(
      "/auth/logout",
      undefined,
      {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
      },
    );

    clearAuthCookies();

    return res.data;
  } catch (error) {
    clearAuthCookies();
    throw error;
  }
};

export interface AuthCookiesSnapshot {
  jwt: string | null;
  refreshToken: string | null;
}

export const getAuthCookiesSnapshot = (): AuthCookiesSnapshot => {
  return {
    jwt: getJwtCookie(),
    refreshToken: getRefreshTokenCookie(),
  };
};
