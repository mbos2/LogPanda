import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { extractJwtClaims } from "../../shared/auth";
import { ok } from "../../shared/response";
import { handleError } from "../../shared/handle-error";

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const claims = extractJwtClaims(event);
    return ok(claims);
  } catch (err) {
    return handleError(err);
  }
};
