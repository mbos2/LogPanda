export const JWT_COOKIE_NAME: string = "logpanda_jwt";
export const REFRESH_TOKEN_COOKIE_NAME: string = "logpanda_refresh_token";

const JWT_MAX_AGE_SECONDS: number = 60 * 60 * 24;
const REFRESH_TOKEN_MAX_AGE_SECONDS: number = 60 * 60 * 24 * 30;

const buildCookieString = (
  name: string,
  value: string,
  maxAgeSeconds: number,
): string => {
  const secure: string =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
};

export const setJwtCookie = (token: string): void => {
  document.cookie = buildCookieString(
    JWT_COOKIE_NAME,
    token,
    JWT_MAX_AGE_SECONDS,
  );
};

export const setRefreshTokenCookie = (token: string): void => {
  document.cookie = buildCookieString(
    REFRESH_TOKEN_COOKIE_NAME,
    token,
    REFRESH_TOKEN_MAX_AGE_SECONDS,
  );
};

export const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies: string[] = document.cookie ? document.cookie.split("; ") : [];
  const prefix: string = `${name}=`;

  for (const cookie of cookies) {
    if (cookie.startsWith(prefix)) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }

  return null;
};

export const getJwtCookie = (): string | null => getCookie(JWT_COOKIE_NAME);

export const getRefreshTokenCookie = (): string | null =>
  getCookie(REFRESH_TOKEN_COOKIE_NAME);

export const removeCookie = (name: string): void => {
  const secure: string =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
};

export const clearAuthCookies = (): void => {
  removeCookie(JWT_COOKIE_NAME);
  removeCookie(REFRESH_TOKEN_COOKIE_NAME);
};
