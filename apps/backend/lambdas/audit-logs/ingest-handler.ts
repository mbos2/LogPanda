import { APIGatewayProxyEventV2 } from "aws-lambda";
import { randomUUID } from "crypto";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { z } from "zod";
import { ok, errorResponse } from "../shared/response";
import { HttpError } from "../shared/http-error";

// 🔥 Make sure this dependency is installed:
// pnpm --filter backend add @aws-sdk/client-sqs

const queueUrl = process.env.AUDIT_LOGS_QUEUE_URL as string;

if (!queueUrl) {
  throw new Error("AUDIT_LOGS_QUEUE_URL not defined");
}

const sqsClient = new SQSClient({});

// ✅ Zod 4 correct record usage
const IngestSchema = z.object({
  projectId: z.string().min(1),
  level: z.enum(["INFO", "WARN", "ERROR"]),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});

type IngestBody = z.infer<typeof IngestSchema>;

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    if (!event.body) {
      throw new HttpError(400, "INVALID_BODY", "Request body is required");
    }

    const apiKey = event.headers["x-api-key"];

    if (!apiKey) {
      throw new HttpError(401, "MISSING_API_KEY", "API key is required");
    }

    // 🔥 TODO: Replace this with your real API key validation logic
    // const resolvedProjectId = await validateApiKey(apiKey);

    const parsed: IngestBody = IngestSchema.parse(JSON.parse(event.body));

    const logMessage = {
      logId: randomUUID(),
      projectId: parsed.projectId,
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

    // 202 because it's queued, not written yet
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
