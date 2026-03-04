import crypto from "crypto";
import { createLog, listLogsByProject } from "./repository";
import { AuditLog, JsonValue, LogLevel } from "./types";
import { HttpError } from "../shared/http-error";
import { getMembership } from "../organization-members/repository";
import { getProjectById } from "../projects/repository";

interface ServiceDeps {
  tableName: string;
  membersTableName: string;
  projectsTableName: string;
}

export const createAuditLogsService = (deps: ServiceDeps) => {
  const resolveProject = async (projectId: string) => {
    const project = await getProjectById(deps.projectsTableName, projectId);

    if (!project) {
      throw new HttpError(404, "NOT_FOUND", "Project not found");
    }

    return project;
  };

  const assertProjectAccess = async (projectId: string, userId: string) => {
    const project = await resolveProject(projectId);

    const membership = await getMembership(
      deps.membersTableName,
      project.organizationId,
      userId,
    );

    if (!membership) {
      throw new HttpError(403, "FORBIDDEN", "No access to project");
    }
  };

  const ingest = async (
    projectId: string,
    level: LogLevel,
    message: string,
    metadata?: Record<string, JsonValue>,
  ): Promise<void> => {
    await resolveProject(projectId);

    const log: AuditLog = {
      logId: crypto.randomUUID(),
      projectId,
      level,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    };

    await createLog(deps.tableName, log);
  };

  const list = async (
    projectId: string,
    userId: string,
  ): Promise<AuditLog[]> => {
    await assertProjectAccess(projectId, userId);
    return listLogsByProject(deps.tableName, projectId);
  };

  return { ingest, list };
};
