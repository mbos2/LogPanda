export const LOG_LEVELS = {
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
} as const;

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

export interface LogEvent {
  projectId: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface LogPandaOptions {
  apiKey: string;
  endpoint: string;
  timeout?: number;
}

export const LOGPANDA_ERROR_CODES = {
  INVALID_API_KEY: "INVALID_API_KEY",
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
} as const;

export type LogPandaErrorCode =
  (typeof LOGPANDA_ERROR_CODES)[keyof typeof LOGPANDA_ERROR_CODES];

export interface LogPandaError {
  code: LogPandaErrorCode;
  message: string;
}

export interface LogPandaSuccessResponse {
  success: true;
  statusCode: number;
}

export interface LogPandaErrorResponse {
  success: false;
  statusCode: number;
  error: LogPandaError;
}

export type LogPandaResponse = LogPandaSuccessResponse | LogPandaErrorResponse;

export const LOGPANDA_ERROR_MESSAGES: Record<LogPandaErrorCode, string> = {
  INVALID_API_KEY: "The provided API key is invalid.",
  UNAUTHORIZED: "Authentication failed.",
  VALIDATION_ERROR: "The request payload is invalid.",
  INTERNAL_SERVER_ERROR: "An unexpected server error occurred.",
  NETWORK_ERROR: "Unable to reach the LogPanda API endpoint.",
};
