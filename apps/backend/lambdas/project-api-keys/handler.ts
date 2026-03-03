import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { extractJwtClaims } from "../shared/auth";
import { HttpError } from "../shared/http-error";
import { CreateApiKeySchema, DeleteApiKeySchema } from "./validation";
import { createProjectApiKeysService } from "./service";

const tableName = process.env.API_KEYS_TABLE_NAME as string;
const membersTableName = process.env.ORGANIZATION_MEMBERS_TABLE_NAME as string;
const projectsTableName = process.env.PROJECTS_TABLE_NAME as string;

const service = createProjectApiKeysService({
  tableName,
  membersTableName,
  projectsTableName,
});

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const { sub } = extractJwtClaims(event);
    const method = event.requestContext.http.method;

    if (method === "POST") {
      const body = CreateApiKeySchema.parse(JSON.parse(event.body ?? "{}"));

      const result = await service.create(body.projectId, body.name, sub);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, data: result }),
      };
    }

    if (method === "DELETE") {
      const body = DeleteApiKeySchema.parse(JSON.parse(event.body ?? "{}"));

      await service.remove(body.apiKeyId, sub);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    if (method === "GET") {
      const projectId = event.queryStringParameters?.projectId;

      if (!projectId) {
        throw new HttpError(400, "INVALID_REQUEST", "projectId required");
      }

      const keys = await service.list(projectId, sub);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, data: keys }),
      };
    }

    throw new HttpError(405, "METHOD_NOT_ALLOWED", "Invalid method");
  } catch (err: unknown) {
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
