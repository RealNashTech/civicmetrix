import { INTERNAL_ERROR, INVALID_REQUEST } from "@/lib/api/errorCodes";
import { error } from "@/lib/api/response";

type RouteHandler<TArgs extends unknown[] = []> = (
  request: Request,
  ...args: TArgs
) => Promise<Response> | Response;

function isStatusError(value: unknown): value is { status: number; message?: string; code?: string } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { status?: unknown };
  return typeof candidate.status === "number";
}

export function apiHandler<TArgs extends unknown[] = []>(handler: RouteHandler<TArgs>): RouteHandler<TArgs> {
  return async (request: Request, ...args: TArgs) => {
    try {
      return await handler(request, ...args);
    } catch (caught) {
      if (isStatusError(caught)) {
        const status = caught.status;
        const code = caught.code ?? (status >= 500 ? INTERNAL_ERROR : INVALID_REQUEST);
        const message = caught.message ?? "Request failed.";
        return error(code, message, status);
      }

      const message = caught instanceof Error ? caught.message : "Internal server error.";
      return error(INTERNAL_ERROR, message, 500);
    }
  };
}
