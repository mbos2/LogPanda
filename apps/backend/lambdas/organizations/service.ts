import {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from "./repository";
import { Organization } from "./types";
import { HttpError } from "./errors";

interface ServiceDeps {
  tableName: string;
}

export const createOrganizationsService = (deps: ServiceDeps) => {
  const create = async (name: string, userId: string): Promise<void> => {
    const organization: Organization = {
      organizationId: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    await createOrganization(deps.tableName, organization);
  };

  const update = async (
    organizationId: string,
    name: string,
    requesterId: string,
  ): Promise<void> => {
    const org = await getOrganizationById(deps.tableName, organizationId);

    if (!org) {
      throw new HttpError(404, "NOT_FOUND", "Organization not found");
    }

    if (org.createdBy !== requesterId) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Only owner can update organization",
      );
    }

    await updateOrganization(deps.tableName, organizationId, name);
  };

  const remove = async (
    organizationId: string,
    requesterId: string,
  ): Promise<void> => {
    const org = await getOrganizationById(deps.tableName, organizationId);

    if (!org) {
      throw new HttpError(404, "NOT_FOUND", "Organization not found");
    }

    if (org.createdBy !== requesterId) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Only owner can delete organization",
      );
    }

    await deleteOrganization(deps.tableName, organizationId);
  };

  return {
    create,
    update,
    remove,
  };
};
