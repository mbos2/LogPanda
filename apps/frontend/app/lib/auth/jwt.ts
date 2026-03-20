import { JwtPayload } from "./types";

const decodeBase64Url = (value: string): string => {
  const normalized: string = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding: number = normalized.length % 4;
  const padded: string =
    padding === 0 ? normalized : normalized + "=".repeat(4 - padding);

  return atob(padded);
};

export const parseJwt = (token: string): JwtPayload | null => {
  try {
    const parts: string[] = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payloadString: string = decodeBase64Url(parts[1]);
    const payload: unknown = JSON.parse(payloadString);

    if (!payload || typeof payload !== "object") {
      return null;
    }

    const data: Record<string, unknown> = payload as Record<string, unknown>;

    if (typeof data.sub !== "string") {
      return null;
    }

    const parsed: JwtPayload = {
      sub: data.sub,
      email: typeof data.email === "string" ? data.email : undefined,
      given_name:
        typeof data.given_name === "string" ? data.given_name : undefined,
      family_name:
        typeof data.family_name === "string" ? data.family_name : undefined,
      exp: typeof data.exp === "number" ? data.exp : undefined,
      iat: typeof data.iat === "number" ? data.iat : undefined,
      ...data,
    };

    return parsed;
  } catch {
    return null;
  }
};

export const isJwtExpired = (token: string): boolean => {
  const payload: JwtPayload | null = parseJwt(token);

  if (!payload || typeof payload.exp !== "number") {
    return true;
  }

  const nowSeconds: number = Math.floor(Date.now() / 1000);

  return payload.exp <= nowSeconds;
};

export const isJwtValid = (token: string): boolean => {
  return parseJwt(token) !== null && !isJwtExpired(token);
};
