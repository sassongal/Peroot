import { NextResponse } from "next/server";

interface ApiErrorOptions {
  status: number;
  error: string;
  code?: string;
}

export function apiError({ status, error, code }: ApiErrorOptions) {
  return NextResponse.json(
    { error, code: code || `ERR_${status}` },
    { status }
  );
}

export const API_ERRORS = {
  unauthorized: () => apiError({ status: 401, error: "Authentication required", code: "UNAUTHORIZED" }),
  forbidden: () => apiError({ status: 403, error: "Access denied", code: "FORBIDDEN" }),
  notFound: (resource = "Resource") => apiError({ status: 404, error: `${resource} not found`, code: "NOT_FOUND" }),
  badRequest: (message: string) => apiError({ status: 400, error: message, code: "BAD_REQUEST" }),
  rateLimit: () => apiError({ status: 429, error: "Too many requests", code: "RATE_LIMITED" }),
  internal: (message = "Internal server error") => apiError({ status: 500, error: message, code: "INTERNAL_ERROR" }),
} as const;
