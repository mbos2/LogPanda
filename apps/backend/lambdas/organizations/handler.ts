import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { z } from "zod";
import { createOrganizationsService } from "./service";
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  DeleteOrganizationSchema,
} from "./validation";
import { HttpError } from "./errors";
import { extractJwtClaims } from "../shared/auth";

const tableName = process.env.ORGANIZATIONS_TABLE_NAME;

if (!tableName) {
  throw new Error("Missing ORGANIZATIONS_TABLE_NAME");
}

const service = createOrganizationsService({
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
      const body = CreateOrganizationSchema.parse(rawBody);
      await service.create(body.name, sub);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    if (method === "PATCH") {
      const body = UpdateOrganizationSchema.parse(rawBody);
      await service.update(body.organizationId, body.name, sub);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    if (method === "DELETE") {
      const body = DeleteOrganizationSchema.parse(rawBody);
      await service.remove(body.organizationId, sub);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
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
