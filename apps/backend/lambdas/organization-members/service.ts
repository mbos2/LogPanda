import {
  getMembership,
  putMember,
  deleteMember,
  updateMemberRole,
  listMembers,
} from "./repository";
import { OrganizationRole, ORGANIZATION_ROLES } from "./types";
import { HttpError } from "./errors";

interface ServiceDeps {
  tableName: string;
}

export const createOrganizationMembersService = (deps: ServiceDeps) => {
  const assertOwner = async (
    organizationId: string,
    requesterId: string,
  ): Promise<void> => {
    const membership = await getMembership(
      deps.tableName,
      organizationId,
      requesterId,
    );

    if (!membership || membership.role !== ORGANIZATION_ROLES.OWNER) {
      throw new HttpError(403, "FORBIDDEN", "Owner access required");
    }
  };

  const add = async (
    organizationId: string,
    userId: string,
    role: OrganizationRole,
    requesterId: string,
  ): Promise<void> => {
    await assertOwner(organizationId, requesterId);

    await putMember(deps.tableName, {
      organizationId,
      userId,
      role,
      joinedAt: new Date().toISOString(),
    });
  };

  const remove = async (
    organizationId: string,
    userId: string,
    requesterId: string,
  ): Promise<void> => {
    await assertOwner(organizationId, requesterId);

    await deleteMember(deps.tableName, organizationId, userId);
  };

  const updateRole = async (
    organizationId: string,
    userId: string,
    role: OrganizationRole,
    requesterId: string,
  ): Promise<void> => {
    await assertOwner(organizationId, requesterId);

    await updateMemberRole(deps.tableName, organizationId, userId, role);
  };

  const list = async (organizationId: string, requesterId: string) => {
    await assertOwner(organizationId, requesterId);

    return listMembers(deps.tableName, organizationId);
  };

  return {
    add,
    remove,
    updateRole,
    list,
  };
};
