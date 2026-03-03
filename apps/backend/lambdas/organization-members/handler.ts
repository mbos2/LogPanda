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

import { extractJwtClaims } from "../shared/auth";
import { HttpError } from "../shared/http-error";
import { ok, errorResponse } from "../shared/response";

const tableName = process.env.ORGANIZATION_MEMBERS_TABLE_NAME;

if (!tableName) {
  throw new Error("Missing ORGANIZATION_MEMBERS_TABLE_NAME");
}

const service = createOrganizationMembersService({ tableName });

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const { sub } = extractJwtClaims(event);
    const method = event.requestContext.http.method;

    const rawBody =
      event.body !== undefined ? JSON.parse(event.body) : undefined;

    switch (method) {
      case "POST": {
        const body = AddMemberSchema.parse(rawBody);
        await service.add(body.organizationId, body.userId, body.role, sub);
        return ok();
      }

      case "PATCH": {
        const body = UpdateMemberRoleSchema.parse(rawBody);
        await service.updateRole(
          body.organizationId,
          body.userId,
          body.role,
          sub,
        );
        return ok();
      }

      case "DELETE": {
        const body = RemoveMemberSchema.parse(rawBody);
        await service.remove(body.organizationId, body.userId, sub);
        return ok();
      }

      case "GET": {
        const organizationId = event.queryStringParameters?.organizationId;

        if (!organizationId) {
          throw new HttpError(
            400,
            "INVALID_REQUEST",
            "organizationId required",
          );
        }

        const members = await service.list(organizationId, sub);

        return ok(members);
      }

      default:
        throw new HttpError(405, "METHOD_NOT_ALLOWED", "Invalid method");
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(400, "INVALID_BODY", err.issues);
    }

    if (err instanceof HttpError) {
      return errorResponse(err.statusCode, err.code, err.message);
    }

    return errorResponse(500, "INTERNAL_ERROR", "Unexpected error");
  }
};
