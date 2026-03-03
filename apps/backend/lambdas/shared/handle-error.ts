import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { HttpError } from "./http-error";
import { errorResponse } from "./response";

export const handleError = (
  err: unknown,
): APIGatewayProxyStructuredResultV2 => {
  if (err instanceof HttpError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }

  return errorResponse(500, "INTERNAL_ERROR", "Unexpected error");
};
