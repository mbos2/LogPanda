import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { extractJwtClaims } from "../shared/auth";
import { ok } from "../shared/response";
import { handleError } from "../shared/handle-error";
import { createProjectMembersService } from "./service";
import {
  AddProjectMemberSchema,
  RemoveProjectMemberSchema,
  UpdateProjectMemberSchema,
} from "./validation";

const tableName = process.env.PROJECT_MEMBERS_TABLE_NAME!;
const projectsTableName = process.env.PROJECTS_TABLE_NAME!;
const orgMembersTableName = process.env.ORGANIZATION_MEMBERS_TABLE_NAME!;

const service = createProjectMembersService({
  tableName,
  projectsTableName,
  orgMembersTableName,
});

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const { sub } = extractJwtClaims(event);
    const method = event.requestContext.http.method;

    if (method === "POST") {
      const body = JSON.parse(event.body ?? "{}");
      const data = AddProjectMemberSchema.parse(body);
      await service.add(data.projectId, data.userId, data.role, sub);
      return ok();
    }

    if (method === "PATCH") {
      const body = JSON.parse(event.body ?? "{}");
      const data = UpdateProjectMemberSchema.parse(body);
      await service.updateRole(data.projectId, data.userId, data.role, sub);
      return ok();
    }

    if (method === "DELETE") {
      const body = JSON.parse(event.body ?? "{}");
      const data = RemoveProjectMemberSchema.parse(body);
      await service.remove(data.projectId, data.userId, sub);
      return ok();
    }

    if (method === "GET") {
      const projectId = event.queryStringParameters?.projectId;
      if (!projectId) {
        throw new Error("projectId required");
      }

      const members = await service.list(projectId, sub);
      return ok(members);
    }

    throw new Error("Method not allowed");
  } catch (err) {
    return handleError(err);
  }
};
