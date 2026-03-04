export declare const LOG_LEVELS: {
    readonly INFO: "INFO";
    readonly WARN: "WARN";
    readonly ERROR: "ERROR";
    readonly DEBUG: "DEBUG";
    readonly SECURITY: "SECURITY";
};
export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];
export interface Actor {
    id: string;
    type: string;
    description?: string;
}
export interface LogEvent {
    event: string;
    type: LogLevel;
    actor?: Actor;
    severity?: number;
    metadata?: Record<string, string | number | boolean | null>;
}
export interface LogPandaOptions {
    apiKey: string;
    endpoint: string;
    timeout?: number;
}
export declare const LOGPANDA_ERROR_CODES: {
    readonly INVALID_API_KEY: "INVALID_API_KEY";
    readonly PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND";
    readonly PROJECT_ID_MISMATCH: "PROJECT_ID_MISMATCH";
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
};
export type LogPandaErrorCode = (typeof LOGPANDA_ERROR_CODES)[keyof typeof LOGPANDA_ERROR_CODES];
export interface LogPandaError {
    code: LogPandaErrorCode;
    message: string;
}
export interface LogPandaSuccessResponse {
    success: true;
    statusCode: number;
    message: string;
}
export interface LogPandaErrorResponse {
    success: false;
    statusCode: number;
    error: LogPandaError;
}
export type LogPandaResponse = LogPandaSuccessResponse | LogPandaErrorResponse;
export declare const LOGPANDA_ERROR_MESSAGES: Record<LogPandaErrorCode, string>;
