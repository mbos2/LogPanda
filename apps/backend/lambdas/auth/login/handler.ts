import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { z } from "zod";

import { ok } from "../../shared/response";
import { handleError } from "../../shared/handle-error";

const client = new CognitoIdentityProviderClient({});
const clientId = process.env.USER_POOL_CLIENT_ID;

if (!clientId) {
  throw new Error("Missing USER_POOL_CLIENT_ID");
}

const Schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;
    const data = Schema.parse(body);

    const result = await client.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: clientId,
        AuthParameters: {
          USERNAME: data.email,
          PASSWORD: data.password,
        },
      }),
    );

    return ok(result.AuthenticationResult);
  } catch (err) {
    return handleError(err);
  }
};
