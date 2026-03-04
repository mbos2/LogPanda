import axios, { AxiosInstance, AxiosError } from "axios";
import {
  LogEvent,
  LogPandaOptions,
  LogPandaResponse,
  LOG_LEVELS,
  LOGPANDA_ERROR_MESSAGES,
  LOGPANDA_ERROR_CODES,
  LogPandaErrorCode,
} from "./types";

interface BackendErrorPayload {
  success: false;
  error: {
    code: string;
    message?: string;
  };
}

interface BackendSuccessPayload {
  success: true;
  message?: string;
}

type BackendPayload = BackendSuccessPayload | BackendErrorPayload;

/**
 * Safely resolves error code to known LogPandaErrorCode.
 * Falls back to INTERNAL_SERVER_ERROR if unknown.
 */
const resolveErrorCode = (code: string): LogPandaErrorCode => {
  if (Object.values(LOGPANDA_ERROR_CODES).includes(code as LogPandaErrorCode)) {
    return code as LogPandaErrorCode;
  }

  return LOGPANDA_ERROR_CODES.INTERNAL_SERVER_ERROR;
};

/**
 * Safely resolves message for error code.
 */
const resolveErrorMessage = (
  code: LogPandaErrorCode,
  backendMessage?: string,
): string => {
  if (backendMessage) return backendMessage;
  return LOGPANDA_ERROR_MESSAGES[code];
};

export class LogPanda {
  private readonly http: AxiosInstance;

  constructor(options: LogPandaOptions) {
    const endpoint = options.endpoint.replace(/\/+$/, "");

    this.http = axios.create({
      baseURL: endpoint,
      timeout: options.timeout ?? 5000,
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async log(event: LogEvent): Promise<LogPandaResponse> {
    try {
      const response = await this.http.post<BackendPayload>("/ingest", event);

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
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<BackendPayload>;

        if (axiosError.response?.data) {
          const backend = axiosError.response.data;

          if (!backend.success) {
            const resolvedCode = resolveErrorCode(backend.error.code);

            return {
              success: false,
              statusCode: axiosError.response.status,
              error: {
                code: resolvedCode,
                message: resolveErrorMessage(
                  resolvedCode,
                  backend.error.message,
                ),
              },
            };
          }
        }

        return {
          success: false,
          statusCode: axiosError.response?.status ?? 0,
          error: {
            code: LOGPANDA_ERROR_CODES.NETWORK_ERROR,
            message: LOGPANDA_ERROR_MESSAGES.NETWORK_ERROR,
          },
        };
      }

      return {
        success: false,
        statusCode: 0,
        error: {
          code: LOGPANDA_ERROR_CODES.NETWORK_ERROR,
          message: LOGPANDA_ERROR_MESSAGES.NETWORK_ERROR,
        },
      };
    }
  }

  async info(
    event: string,
    payload?: Omit<LogEvent, "event" | "type">,
  ): Promise<LogPandaResponse> {
    return this.log({
      event,
      type: LOG_LEVELS.INFO,
      ...payload,
    });
  }

  async warn(
    event: string,
    payload?: Omit<LogEvent, "event" | "type">,
  ): Promise<LogPandaResponse> {
    return this.log({
      event,
      type: LOG_LEVELS.WARN,
      ...payload,
    });
  }

  async error(
    event: string,
    payload?: Omit<LogEvent, "event" | "type">,
  ): Promise<LogPandaResponse> {
    return this.log({
      event,
      type: LOG_LEVELS.ERROR,
      ...payload,
    });
  }

  async debug(
    event: string,
    payload?: Omit<LogEvent, "event" | "type">,
  ): Promise<LogPandaResponse> {
    return this.log({
      event,
      type: LOG_LEVELS.DEBUG,
      ...payload,
    });
  }

  async security(
    event: string,
    payload?: Omit<LogEvent, "event" | "type">,
  ): Promise<LogPandaResponse> {
    return this.log({
      event,
      type: LOG_LEVELS.SECURITY,
      ...payload,
    });
  }
}
