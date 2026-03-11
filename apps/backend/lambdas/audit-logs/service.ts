import { queryLogs } from "./repository";
import { HttpError } from "../shared/http-error";
import { getMembership } from "../organization-members/repository";
import { getProjectById } from "../projects/repository";

const DEFAULT_LIMIT = Number(process.env.LOGS_DEFAULT_PAGINATION_LIMIT ?? 100);
const MAX_LIMIT = Number(process.env.LOGS_MAX_PAGINATION_LIMIT ?? 500);

interface ServiceDeps {
  tableName: string;
  membersTableName: string;
  projectsTableName: string;
}

export const createAuditLogsService = (deps: ServiceDeps) => {
  const list = async (
    projectId: string,
    userId: string,
    options: {
      limit?: number;
      cursor?: string;
      from?: string;
      to?: string;
      levels?: string[];
    },
  ) => {
    const project = await getProjectById(deps.projectsTableName, projectId);
    if (!project) {
      throw new HttpError(404, "PROJECT_NOT_FOUND", "Project not found");
    }

    const membership = await getMembership(
      deps.membersTableName,
      project.organizationId,
      userId,
    );

    if (!membership) {
      throw new HttpError(403, "FORBIDDEN", "Access denied");
    }

    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const cursor = options.cursor
      ? JSON.parse(Buffer.from(options.cursor, "base64").toString("utf8"))
      : undefined;

    const result = await queryLogs<any>({
      tableName: deps.tableName,
      projectId,
      from: options.from,
      to: options.to,
      levels: options.levels,
      limit,
      cursor,
    });

    return {
      items: result.items,
      nextCursor: result.nextCursor
        ? Buffer.from(JSON.stringify(result.nextCursor)).toString("base64")
        : null,
    };
  };

  return { list };
};
