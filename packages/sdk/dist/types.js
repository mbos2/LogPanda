"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOGPANDA_ERROR_MESSAGES = exports.LOGPANDA_ERROR_CODES = exports.LOG_LEVELS = void 0;
exports.LOG_LEVELS = {
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR",
    DEBUG: "DEBUG",
    SECURITY: "SECURITY",
};
exports.LOGPANDA_ERROR_CODES = {
    INVALID_API_KEY: "INVALID_API_KEY",
    PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
    PROJECT_ID_MISMATCH: "PROJECT_ID_MISMATCH",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
    NETWORK_ERROR: "NETWORK_ERROR",
};
exports.LOGPANDA_ERROR_MESSAGES = {
    INVALID_API_KEY: "The provided API key is invalid.",
    PROJECT_NOT_FOUND: "The specified project does not exist.",
    PROJECT_ID_MISMATCH: "The API key does not belong to the specified project.",
    UNAUTHORIZED: "Authentication is required.",
    FORBIDDEN: "You do not have permission to perform this action.",
    VALIDATION_ERROR: "The request payload is invalid.",
    INTERNAL_SERVER_ERROR: "An unexpected server error occurred.",
    NETWORK_ERROR: "Unable to reach the LogPanda API endpoint.",
};
