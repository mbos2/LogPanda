import { APIGatewayProxyEventV2 } from "aws-lambda";
import argon2 from "argon2";
import { IngestLogSchema } from "./validation";
import { createAuditLogsService } from "./service";
import { HttpError } from "../shared/http-error";
import { getApiKeyById } from "../project-api-keys/repository";

const tableName = process.env.AUDIT_LOGS_TABLE_NAME as string;
const membersTableName = process.env.ORGANIZATION_MEMBERS_TABLE_NAME as string;
const projectsTableName = process.env.PROJECTS_TABLE_NAME as string;
const apiKeysTableName = process.env.API_KEYS_TABLE_NAME as string;

const service = createAuditLogsService({
  tableName,
  membersTableName,
  projectsTableName,
});

const extractBearerToken = (event: APIGatewayProxyEventV2): string => {
  const authHeader = event.headers.authorization ?? event.headers.Authorization;

  if (!authHeader) {
    throw new HttpError(401, "UNAUTHORIZED", "Missing API key");
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid auth header");
  }

  return parts[1];
};

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const plainKey = extractBearerToken(event);

    // 🔎 Parse body first
    const body = IngestLogSchema.parse(JSON.parse(event.body ?? "{}"));

    // 🔎 Extract apiKeyId from key format
    // Recommended format: <apiKeyId>.<secret>
    const [apiKeyId] = plainKey.split(".");

    if (!apiKeyId) {
      throw new HttpError(401, "UNAUTHORIZED", "Invalid API key");
    }

    const storedKey = await getApiKeyById(apiKeysTableName, apiKeyId);

    if (!storedKey || !storedKey.isActive) {
      throw new HttpError(401, "UNAUTHORIZED", "Invalid API key");
    }

    const isValid = await argon2.verify(storedKey.keyHash, plainKey);

    if (!isValid) {
      throw new HttpError(401, "UNAUTHORIZED", "Invalid API key");
    }

    // Ensure key belongs to same project
    if (storedKey.projectId !== body.projectId) {
      throw new HttpError(403, "FORBIDDEN", "Project mismatch");
    }

    await service.ingest(
      body.projectId,
      body.level,
      body.message,
      body.metadata,
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    if (err instanceof HttpError) {
      return {
        statusCode: err.statusCode,
        body: JSON.stringify({
          success: false,
          error: { code: err.code, message: err.message },
        }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Invalid request" },
      }),
    };
  }
};
