import { z } from "zod";
import type { JsonValue } from "./types";

const JsonSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonSchema),
    z.record(z.string(), JsonSchema),
  ]),
);

export const IngestLogSchema = z.object({
  projectId: z.string().min(1),
  level: z.enum(["INFO", "WARN", "ERROR"]),
  message: z.string().min(1),
  metadata: z.record(z.string(), JsonSchema).optional(),
});
