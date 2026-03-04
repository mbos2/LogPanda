import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { extractJwtClaims } from "../shared/auth";
import { createAuditLogsService } from "./service";
import { HttpError } from "../shared/http-error";

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
    const projectId = event.queryStringParameters?.projectId;

    if (!projectId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: { code: "INVALID_REQUEST", message: "projectId required" },
        }),
      };
    }

    const logs = await service.list(projectId, sub);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: logs }),
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
        error: { code: "INTERNAL_ERROR", message: "Unexpected error" },
      }),
    };
  }
};
