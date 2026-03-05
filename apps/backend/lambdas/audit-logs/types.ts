export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "SECURITY";

export interface AuditLog {
  logId: string;
  projectId: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, JsonValue>;
  timestamp: string;
}

export interface IngestLogBody {
  projectId: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, JsonValue>;
}
