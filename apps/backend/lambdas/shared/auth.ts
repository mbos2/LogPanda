import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { HttpError } from "./http-error";

export interface JwtClaims {
  sub: string;
  email?: string;
}

export const extractJwtClaims = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): JwtClaims => {
  const claims = event.requestContext.authorizer?.jwt?.claims;

  if (!claims || typeof claims.sub !== "string") {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid or missing JWT");
  }

  return {
    sub: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
  };
};
