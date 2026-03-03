import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { z } from "zod";

import { createProjectsService } from "./service";
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  DeleteProjectSchema,
} from "./validation";

import { extractJwtClaims } from "../shared/auth";
import { HttpError } from "../shared/http-error";
import { ok, errorResponse } from "../shared/response";

const projectsTableName = process.env.PROJECTS_TABLE_NAME;
const membersTableName = process.env.ORGANIZATION_MEMBERS_TABLE_NAME;

if (!projectsTableName) {
  throw new Error("Missing PROJECTS_TABLE_NAME");
}

if (!membersTableName) {
  throw new Error("Missing ORGANIZATION_MEMBERS_TABLE_NAME");
}

const service = createProjectsService({
  tableName: projectsTableName,
  membersTableName,
});

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
        const body = CreateProjectSchema.parse(rawBody);
        await service.create(body.organizationId, body.name, sub);
        return ok();
      }

      case "PATCH": {
        const body = UpdateProjectSchema.parse(rawBody);
        await service.update(body.projectId, body.name, sub);
        return ok();
      }

      case "DELETE": {
        const body = DeleteProjectSchema.parse(rawBody);
        await service.remove(body.projectId, sub);
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

        const projects = await service.list(organizationId, sub);

        return ok(projects);
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
