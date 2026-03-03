import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { z } from "zod";
import { createOrganizationMembersService } from "./service";
import {
  AddMemberSchema,
  UpdateMemberRoleSchema,
  RemoveMemberSchema,
} from "./validation";
import { HttpError } from "./errors";
import { extractJwtClaims } from "../shared/auth";

const tableName = process.env.ORGANIZATION_MEMBERS_TABLE_NAME;

if (!tableName) {
  throw new Error("Missing ORGANIZATION_MEMBERS_TABLE_NAME");
}

const service = createOrganizationMembersService({
  tableName,
});

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const { sub } = extractJwtClaims(event);
    const method = event.requestContext.http.method;

    const rawBody =
      event.body !== undefined ? JSON.parse(event.body) : undefined;

    if (method === "POST") {
      const body = AddMemberSchema.parse(rawBody);
      await service.add(body.organizationId, body.userId, body.role, sub);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    if (method === "PATCH") {
      const body = UpdateMemberRoleSchema.parse(rawBody);

      await service.updateRole(
        body.organizationId,
        body.userId,
        body.role,
        sub,
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    if (method === "DELETE") {
      const body = RemoveMemberSchema.parse(rawBody);

      await service.remove(body.organizationId, body.userId, sub);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    if (method === "GET") {
      const organizationId = event.queryStringParameters?.organizationId;

      if (!organizationId) {
        throw new HttpError(400, "INVALID_REQUEST", "organizationId required");
      }

      const members = await service.list(organizationId, sub);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: members,
        }),
      };
    }

    throw new HttpError(405, "METHOD_NOT_ALLOWED", "Invalid method");
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: {
            code: "INVALID_BODY",
            message: err.issues,
          },
        }),
      };
    }

    if (err instanceof HttpError) {
      return {
        statusCode: err.statusCode,
        body: JSON.stringify({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unexpected error",
        },
      }),
    };
  }
};
