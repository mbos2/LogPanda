import crypto from "crypto";
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import {
  AdminConfirmSignUpCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { ok } from "../../shared/response";
import { handleError } from "../../shared/handle-error";
import { HttpError } from "../../shared/http-error";

const cognitoClient = new CognitoIdentityProviderClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const userPoolId = process.env.USER_POOL_ID;
const tableName = process.env.EMAIL_VERIFICATION_TOKENS_TABLE_NAME;

if (!userPoolId) {
  throw new Error("Missing USER_POOL_ID");
}

if (!tableName) {
  throw new Error("Missing EMAIL_VERIFICATION_TOKENS_TABLE_NAME");
}

const Schema = z.object({
  token: z.string().min(1),
});

const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const body = event.body ? JSON.parse(event.body) : undefined;
    const data = Schema.parse(body);

    const tokenHash = hashToken(data.token);

    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { tokenHash },
      }),
    );

    const item = result.Item as
      | {
          tokenHash: string;
          username: string;
          email: string;
          expiresAt: number;
          consumedAt?: string | null;
        }
      | undefined;

    if (!item) {
      throw new HttpError(400, "INVALID_TOKEN", "Invalid verification link");
    }

    if (item.consumedAt) {
      throw new HttpError(
        400,
        "TOKEN_ALREADY_USED",
        "Verification link already used",
      );
    }

    if (item.expiresAt <= Math.floor(Date.now() / 1000)) {
      throw new HttpError(400, "TOKEN_EXPIRED", "Verification link expired");
    }

    await cognitoClient.send(
      new AdminConfirmSignUpCommand({
        UserPoolId: userPoolId,
        Username: item.username,
      }),
    );

    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { tokenHash },
        UpdateExpression: "SET consumedAt = :consumedAt",
        ExpressionAttributeValues: {
          ":consumedAt": new Date().toISOString(),
        },
      }),
    );

    return ok();
  } catch (err) {
    return handleError(err);
  }
};
