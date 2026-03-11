import { APIGatewayProxyEventV2 } from "aws-lambda";
import { randomUUID } from "crypto";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import argon2 from "argon2";
import { z } from "zod";
import { errorResponse } from "../shared/response";
import { HttpError } from "../shared/http-error";
import { IngestLogSchema } from "./validation";

const queueUrl = process.env.AUDIT_LOGS_QUEUE_URL as string;
const apiKeysTableName = process.env.API_KEYS_TABLE_NAME as string;

if (!queueUrl) throw new Error("AUDIT_LOGS_QUEUE_URL not defined");
if (!apiKeysTableName) throw new Error("API_KEYS_TABLE_NAME not defined");

const sqsClient = new SQSClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

type IngestBody = z.infer<typeof IngestLogSchema>;

function parseApiKey(raw: string): { apiKeyId: string; secret: string } {
  const parts = raw.split("_");

  if (parts.length !== 3 || parts[0] !== "lp") {
    throw new HttpError(401, "INVALID_API_KEY", "Invalid API key format");
  }

  return {
    apiKeyId: parts[1],
    secret: parts[2],
  };
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    if (!event.body) {
      throw new HttpError(400, "INVALID_BODY", "Request body is required");
    }

    const rawApiKey = event.headers["x-api-key"];

    if (!rawApiKey) {
      throw new HttpError(401, "MISSING_API_KEY", "API key is required");
    }

    const { apiKeyId, secret } = parseApiKey(rawApiKey);

    const keyResult = await docClient.send(
      new GetCommand({
        TableName: apiKeysTableName,
        Key: { apiKeyId },
      }),
    );

    const keyItem = keyResult.Item;

    if (!keyItem) {
      throw new HttpError(401, "INVALID_API_KEY", "API key not found");
    }

    if (!keyItem.isActive) {
      throw new HttpError(403, "API_KEY_INACTIVE", "API key is inactive");
    }

    const isValid = await argon2.verify(keyItem.keyHash, secret);

    if (!isValid) {
      throw new HttpError(401, "INVALID_API_KEY", "Invalid API key");
    }

    const parsed: IngestBody = IngestLogSchema.parse(JSON.parse(event.body));

    const logMessage = {
      logId: randomUUID(),
      projectId: keyItem.projectId,
      level: parsed.level,
      message: parsed.message,
      metadata: parsed.metadata,
      timestamp: new Date().toISOString(),
    };

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(logMessage),
      }),
    );

    return {
      statusCode: 202,
      body: JSON.stringify({
        success: true,
        data: { accepted: true },
      }),
    };
  } catch (err) {
    if (err instanceof HttpError) {
      return errorResponse(err.statusCode, err.code, err.message);
    }

    if (err instanceof z.ZodError) {
      return errorResponse(400, "VALIDATION_ERROR", err.issues);
    }

    return errorResponse(500, "INTERNAL_SERVER_ERROR", "Unexpected error");
  }
};
