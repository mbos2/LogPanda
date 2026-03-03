import { z } from "zod";
import { ORGANIZATION_ROLES, OrganizationRole } from "./types";

const roleValues = Object.values(ORGANIZATION_ROLES) as [
  OrganizationRole,
  ...OrganizationRole[],
];

const roleSchema = z.enum(roleValues);

export const AddMemberSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  role: roleSchema,
});

export const UpdateMemberRoleSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
  role: roleSchema,
});

export const RemoveMemberSchema = z.object({
  organizationId: z.string().min(1),
  userId: z.string().min(1),
});
