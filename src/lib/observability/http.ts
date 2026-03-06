import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { runWithObservabilityContext } from "@/lib/observability/context";
import { logApiRequestEnd, logApiRequestError, logApiRequestStart } from "@/lib/observability/logger";

type Handler<TArgs extends unknown[]> = (request: Request, ...args: TArgs) => Promise<Response>;

export function withApiObservability<TArgs extends unknown[]>(
  route: string,
  method: string,
  handler: Handler<TArgs>,
): Handler<TArgs> {
  return async (request: Request, ...args: TArgs) => {
    const startedAt = Date.now();
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    const tenantId = request.headers.get("x-civicmetrix-tenant") ?? undefined;

    return runWithObservabilityContext({ requestId, tenantId, route }, async () => {
      logApiRequestStart(route, method);

      try {
        const response = await handler(request, ...args);
        const latency = Date.now() - startedAt;
        logApiRequestEnd(route, method, response.status, latency);

        const headers = new Headers(response.headers);
        headers.set("x-request-id", requestId);

        return new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch (error) {
        const latency = Date.now() - startedAt;
        logApiRequestError(route, method, latency, error);

        const response = NextResponse.json({ error: "Internal server error." }, { status: 500 });
        response.headers.set("x-request-id", requestId);
        return response;
      }
    });
  };
}
