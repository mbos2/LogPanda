import { z } from "zod";
import { PROJECT_ROLES, ProjectRole } from "./types";

const roleValues = Object.values(PROJECT_ROLES) as [
  ProjectRole,
  ...ProjectRole[],
];

const roleSchema = z.enum(roleValues);

export const AddProjectMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  role: roleSchema,
});

export const RemoveProjectMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export const UpdateProjectMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  role: roleSchema,
});
