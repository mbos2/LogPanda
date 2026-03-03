import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import { ok } from "../../shared/response";
import { handleError } from "../../shared/handle-error";
import { extractJwtClaims } from "../../shared/auth";
import { HttpError } from "../../shared/http-error";

const client = new CognitoIdentityProviderClient({});

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    extractJwtClaims(event);

    const authHeader = event.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      throw new HttpError(401, "UNAUTHORIZED", "Missing access token");
    }

    await client.send(
      new GlobalSignOutCommand({
        AccessToken: token,
      }),
    );

    return ok();
  } catch (err) {
    return handleError(err);
  }
};
