import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export const ok = (data?: unknown): APIGatewayProxyStructuredResultV2 => ({
  statusCode: 200,
  body: JSON.stringify(data ? { success: true, data } : { success: true }),
});

export const errorResponse = (
  statusCode: number,
  code: string,
  message: unknown,
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  body: JSON.stringify({
    success: false,
    error: { code, message },
  }),
});
