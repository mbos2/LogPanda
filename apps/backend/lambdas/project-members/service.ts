import {
  getProjectMembership,
  putProjectMember,
  deleteProjectMember,
  updateProjectMemberRole,
  listProjectMembers,
} from "./repository";
import { ProjectRole } from "./types";
import { HttpError } from "../shared/http-error";
import { getProjectById } from "../projects/repository";
import { getMembership } from "../organization-members/repository";
import { ORGANIZATION_ROLES } from "../organization-members/types";

interface ServiceDeps {
  tableName: string;
  projectsTableName: string;
  orgMembersTableName: string;
}

export const createProjectMembersService = (deps: ServiceDeps) => {
  const assertAdminOrOwner = async (projectId: string, requesterId: string) => {
    const project = await getProjectById(deps.projectsTableName, projectId);

    if (!project) {
      throw new HttpError(404, "NOT_FOUND", "Project not found");
    }

    const orgMembership = await getMembership(
      deps.orgMembersTableName,
      project.organizationId,
      requesterId,
    );

    if (
      !orgMembership ||
      (orgMembership.role !== ORGANIZATION_ROLES.OWNER &&
        orgMembership.role !== ORGANIZATION_ROLES.ADMIN)
    ) {
      throw new HttpError(403, "FORBIDDEN", "Insufficient permissions");
    }

    return project;
  };

  const add = async (
    projectId: string,
    userId: string,
    role: ProjectRole,
    requesterId: string,
  ): Promise<void> => {
    await assertAdminOrOwner(projectId, requesterId);

    await putProjectMember(deps.tableName, {
      projectId,
      userId,
      role,
      joinedAt: new Date().toISOString(),
    });
  };

  const remove = async (
    projectId: string,
    userId: string,
    requesterId: string,
  ): Promise<void> => {
    await assertAdminOrOwner(projectId, requesterId);
    await deleteProjectMember(deps.tableName, projectId, userId);
  };

  const updateRole = async (
    projectId: string,
    userId: string,
    role: ProjectRole,
    requesterId: string,
  ): Promise<void> => {
    await assertAdminOrOwner(projectId, requesterId);
    await updateProjectMemberRole(deps.tableName, projectId, userId, role);
  };

  const list = async (projectId: string, requesterId: string) => {
    await assertAdminOrOwner(projectId, requesterId);
    return listProjectMembers(deps.tableName, projectId);
  };

  return { add, remove, updateRole, list };
};
