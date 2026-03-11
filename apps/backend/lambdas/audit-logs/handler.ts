import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { extractJwtClaims } from "../shared/auth";
import { HttpError } from "../shared/http-error";
import { createAuditLogsService } from "./service";

const tableName = process.env.AUDIT_LOGS_TABLE_NAME as string;
const membersTableName = process.env.ORGANIZATION_MEMBERS_TABLE_NAME as string;
const projectsTableName = process.env.PROJECTS_TABLE_NAME as string;

const service = createAuditLogsService({
  tableName,
  membersTableName,
  projectsTableName,
});

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const { sub } = extractJwtClaims(event);
    const q = event.queryStringParameters ?? {};

    if (!q.projectId) {
      throw new HttpError(400, "INVALID_REQUEST", "projectId required");
    }

    const result = await service.list(q.projectId, sub, {
      limit: q.limit ? Number(q.limit) : undefined,
      cursor: q.cursor,
      from: q.from,
      to: q.to,
      levels: q.level ? q.level.split(",") : undefined,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: result,
      }),
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
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unexpected error",
        },
      }),
    };
  }
};