import axios, { AxiosInstance, AxiosError } from "axios";
import {
  LogEvent,
  LogPandaOptions,
  LogPandaResponse,
  LOGPANDA_ERROR_CODES,
  LOGPANDA_ERROR_MESSAGES,
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
  data: {
    accepted: true;
  };
}

type BackendPayload = BackendSuccessPayload | BackendErrorPayload;

const resolveErrorCode = (code: string): LogPandaErrorCode => {
  if (Object.values(LOGPANDA_ERROR_CODES).includes(code as LogPandaErrorCode)) {
    return code as LogPandaErrorCode;
  }
  return LOGPANDA_ERROR_CODES.INTERNAL_SERVER_ERROR;
};

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
        "x-api-key": options.apiKey,
        "Content-Type": "application/json",
      },
    });
  }

  async log(event: LogEvent): Promise<LogPandaResponse> {
    try {
      const response = await this.http.post<BackendPayload>("/ingest", event);

      if (response.data.success) {
        return {
          success: true,
          statusCode: response.status,
        };
      }

      const resolvedCode = resolveErrorCode(response.data.error.code);

      return {
        success: false,
        statusCode: response.status,
        error: {
          code: resolvedCode,
          message: resolveErrorMessage(
            resolvedCode,
            response.data.error.message,
          ),
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<BackendPayload>;

        if (axiosError.response?.data && !axiosError.response.data.success) {
          const resolvedCode = resolveErrorCode(
            axiosError.response.data.error.code,
          );

          return {
            success: false,
            statusCode: axiosError.response.status,
            error: {
              code: resolvedCode,
              message: resolveErrorMessage(
                resolvedCode,
                axiosError.response.data.error.message,
              ),
            },
          };
        }
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
}
