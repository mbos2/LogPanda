import { z } from "zod";

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1),
});

export const UpdateOrganizationSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1),
});

export const DeleteOrganizationSchema = z.object({
  organizationId: z.string().min(1),
});
