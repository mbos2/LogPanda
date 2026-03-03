import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import { ok } from "../../shared/response";
import { handleError } from "../../shared/handle-error";
import { extractJwtClaims } from "../../shared/auth";
import { HttpError } from "../../shared/http-error";

const client = new CognitoIdentityProviderClient({});
const userPoolId = process.env.USER_POOL_ID;

if (!userPoolId) {
  throw new Error("Missing USER_POOL_ID");
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    extractJwtClaims(event);

    const email = event.queryStringParameters?.email;

    if (!email) {
      throw new HttpError(400, "INVALID_REQUEST", "email query param required");
    }

    const result = await client.send(
      new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `email = "${email}"`,
        Limit: 1,
      }),
    );

    if (!result.Users || result.Users.length === 0) {
      throw new HttpError(404, "NOT_FOUND", "User not found");
    }

    const user = result.Users[0];
    const subAttr = user.Attributes?.find((a) => a.Name === "sub");

    if (!subAttr?.Value) {
      throw new HttpError(500, "INVALID_USER", "User missing sub");
    }

    return ok({
      userId: subAttr.Value,
      email,
    });
  } catch (err) {
    return handleError(err);
  }
};
