import crypto from "crypto";
import argon2 from "argon2";
import {
  createApiKey,
  getApiKeyById,
  listApiKeysByProject,
  deactivateApiKey,
} from "./repository";
import { ProjectApiKey } from "./types";
import { HttpError } from "../shared/http-error";
import { getMembership } from "../organization-members/repository";
import { getProjectById } from "../projects/repository";
import { ORGANIZATION_ROLES } from "../organization-members/types";

interface ServiceDeps {
  tableName: string;
  membersTableName: string;
  projectsTableName: string;
}

export const createProjectApiKeysService = (deps: ServiceDeps) => {
  const assertCreatePermission = async (projectId: string, userId: string) => {
    const project = await getProjectById(deps.projectsTableName, projectId);

    if (!project) {
      throw new HttpError(404, "NOT_FOUND", "Project not found");
    }

    const membership = await getMembership(
      deps.membersTableName,
      project.organizationId,
      userId,
    );

    if (
      !membership ||
      (membership.role !== ORGANIZATION_ROLES.OWNER &&
        membership.role !== ORGANIZATION_ROLES.ADMIN)
    ) {
      throw new HttpError(403, "FORBIDDEN", "Insufficient permissions");
    }

    return project;
  };

  const assertDeletePermission = async (projectId: string, userId: string) => {
    const project = await getProjectById(deps.projectsTableName, projectId);

    if (!project) {
      throw new HttpError(404, "NOT_FOUND", "Project not found");
    }

    const membership = await getMembership(
      deps.membersTableName,
      project.organizationId,
      userId,
    );

    if (!membership || membership.role !== ORGANIZATION_ROLES.OWNER) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Only owner can deactivate API key",
      );
    }
  };

  const create = async (projectId: string, name: string, userId: string) => {
    await assertCreatePermission(projectId, userId);

    const existing = await listApiKeysByProject(deps.tableName, projectId);

    for (const key of existing) {
      if (key.isActive) {
        await deactivateApiKey(deps.tableName, key.apiKeyId);
      }
    }

    const secret = crypto.randomBytes(32).toString("hex");
    const keyHash = await argon2.hash(secret);

    const apiKey: ProjectApiKey = {
      apiKeyId: crypto.randomUUID(),
      projectId,
      name,
      keyHash,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      isActive: true,
    };

    await createApiKey(deps.tableName, apiKey);

    return {
      apiKeyId: apiKey.apiKeyId,
      plainKey: `lp_${apiKey.apiKeyId}_${secret}`,
    };
  };

  const remove = async (apiKeyId: string, userId: string) => {
    const key = await getApiKeyById(deps.tableName, apiKeyId);

    if (!key) {
      throw new HttpError(404, "NOT_FOUND", "API key not found");
    }

    await assertDeletePermission(key.projectId, userId);

    await deactivateApiKey(deps.tableName, apiKeyId);
  };

  const list = async (projectId: string, userId: string) => {
    await assertCreatePermission(projectId, userId);
    return listApiKeysByProject(deps.tableName, projectId);
  };

  return { create, remove, list };
};
