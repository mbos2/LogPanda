import { z } from "zod";

export const CreateApiKeySchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
});

export const DeleteApiKeySchema = z.object({
  apiKeyId: z.string().min(1),
});
