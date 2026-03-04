"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogPanda = void 0;
const axios_1 = __importDefault(require("axios"));
const types_1 = require("./types");
/**
 * Safely resolves error code to known LogPandaErrorCode.
 * Falls back to INTERNAL_SERVER_ERROR if unknown.
 */
const resolveErrorCode = (code) => {
    if (Object.values(types_1.LOGPANDA_ERROR_CODES).includes(code)) {
        return code;
    }
    return types_1.LOGPANDA_ERROR_CODES.INTERNAL_SERVER_ERROR;
};
/**
 * Safely resolves message for error code.
 */
const resolveErrorMessage = (code, backendMessage) => {
    if (backendMessage)
        return backendMessage;
    return types_1.LOGPANDA_ERROR_MESSAGES[code];
};
class LogPanda {
    http;
    constructor(options) {
        const endpoint = options.endpoint.replace(/\/+$/, "");
        this.http = axios_1.default.create({
            baseURL: endpoint,
            timeout: options.timeout ?? 5000,
            headers: {
                Authorization: `Bearer ${options.apiKey}`,
                "Content-Type": "application/json",
            },
        });
    }
    async log(event) {
        try {
            const response = await this.http.post("/ingest", event);
            const data = response.data;
            if (data.success) {
                return {
                    success: true,
                    statusCode: response.status,
                    message: data.message ?? "Log stored successfully.",
                };
            }
            const resolvedCode = resolveErrorCode(data.error.code);
            return {
                success: false,
                statusCode: response.status,
                error: {
                    code: resolvedCode,
                    message: resolveErrorMessage(resolvedCode, data.error.message),
                },
            };
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                if (axiosError.response?.data) {
                    const backend = axiosError.response.data;
                    if (!backend.success) {
                        const resolvedCode = resolveErrorCode(backend.error.code);
                        return {
                            success: false,
                            statusCode: axiosError.response.status,
                            error: {
                                code: resolvedCode,
                                message: resolveErrorMessage(resolvedCode, backend.error.message),
                            },
                        };
                    }
                }
                return {
                    success: false,
                    statusCode: axiosError.response?.status ?? 0,
                    error: {
                        code: types_1.LOGPANDA_ERROR_CODES.NETWORK_ERROR,
                        message: types_1.LOGPANDA_ERROR_MESSAGES.NETWORK_ERROR,
                    },
                };
            }
            return {
                success: false,
                statusCode: 0,
                error: {
                    code: types_1.LOGPANDA_ERROR_CODES.NETWORK_ERROR,
                    message: types_1.LOGPANDA_ERROR_MESSAGES.NETWORK_ERROR,
                },
            };
        }
    }
    async info(event, payload) {
        return this.log({
            event,
            type: types_1.LOG_LEVELS.INFO,
            ...payload,
        });
    }
    async warn(event, payload) {
        return this.log({
            event,
            type: types_1.LOG_LEVELS.WARN,
            ...payload,
        });
    }
    async error(event, payload) {
        return this.log({
            event,
            type: types_1.LOG_LEVELS.ERROR,
            ...payload,
        });
    }
    async debug(event, payload) {
        return this.log({
            event,
            type: types_1.LOG_LEVELS.DEBUG,
            ...payload,
        });
    }
    async security(event, payload) {
        return this.log({
            event,
            type: types_1.LOG_LEVELS.SECURITY,
            ...payload,
        });
    }
}
exports.LogPanda = LogPanda;
