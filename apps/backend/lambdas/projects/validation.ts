import { z } from "zod";

export const CreateProjectSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1),
});

export const UpdateProjectSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
});

export const DeleteProjectSchema = z.object({
  projectId: z.string().min(1),
});
