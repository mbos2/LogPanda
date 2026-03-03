import {
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  listProjectsByOrganization,
} from "./repository";
import { Project } from "./types";
import { HttpError } from "../shared/http-error";
import { getMembership } from "../organization-members/repository";
import { ORGANIZATION_ROLES } from "../organization-members/types";

interface ServiceDeps {
  tableName: string;
  membersTableName: string;
}

export const createProjectsService = (deps: ServiceDeps) => {
  const assertCreateOrUpdatePermission = async (
    organizationId: string,
    userId: string,
  ) => {
    const membership = await getMembership(
      deps.membersTableName,
      organizationId,
      userId,
    );

    if (
      !membership ||
      (membership.role !== ORGANIZATION_ROLES.OWNER &&
        membership.role !== ORGANIZATION_ROLES.ADMIN)
    ) {
      throw new HttpError(403, "FORBIDDEN", "Insufficient permissions");
    }
  };

  const assertDeletePermission = async (
    organizationId: string,
    userId: string,
  ) => {
    const membership = await getMembership(
      deps.membersTableName,
      organizationId,
      userId,
    );

    if (!membership || membership.role !== ORGANIZATION_ROLES.OWNER) {
      throw new HttpError(403, "FORBIDDEN", "Only owner can delete project");
    }
  };

  const create = async (
    organizationId: string,
    name: string,
    userId: string,
  ) => {
    await assertCreateOrUpdatePermission(organizationId, userId);

    const project: Project = {
      projectId: crypto.randomUUID(),
      organizationId,
      name,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    await createProject(deps.tableName, project);
  };

  const update = async (projectId: string, name: string, userId: string) => {
    const project = await getProjectById(deps.tableName, projectId);

    if (!project) {
      throw new HttpError(404, "NOT_FOUND", "Project not found");
    }

    await assertCreateOrUpdatePermission(project.organizationId, userId);

    await updateProject(deps.tableName, projectId, name);
  };

  const remove = async (projectId: string, userId: string) => {
    const project = await getProjectById(deps.tableName, projectId);

    if (!project) {
      throw new HttpError(404, "NOT_FOUND", "Project not found");
    }

    await assertDeletePermission(project.organizationId, userId);

    await deleteProject(deps.tableName, projectId);
  };

  const list = async (organizationId: string, userId: string) => {
    const membership = await getMembership(
      deps.membersTableName,
      organizationId,
      userId,
    );

    if (!membership) {
      throw new HttpError(403, "FORBIDDEN", "No access to organization");
    }

    return listProjectsByOrganization(deps.tableName, organizationId);
  };

  return { create, update, remove, list };
};
