import { NextResponse } from "next/server";

import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/security/rateLimitMiddleware";
import { RateLimitTierName } from "@/lib/security/rateLimits";

type RouteHandler<TArgs extends unknown[] = []> = (
  request: Request,
  ...args: TArgs
) => Promise<Response> | Response;

export function withRateLimit<TArgs extends unknown[] = []>(
  tier: RateLimitTierName,
  handler: RouteHandler<TArgs>,
): RouteHandler<TArgs> {
  return async (request: Request, ...args: TArgs) => {
    const result = await checkRateLimit(tier, request);

    if (!result.allowed) {
      return rateLimitExceededResponse(result);
    }

    const response = await handler(request, ...args);

    const headers = new Headers(response.headers);
    headers.set("X-RateLimit-Limit", String(result.limit));
    headers.set("X-RateLimit-Remaining", String(result.remaining));
    headers.set("X-RateLimit-Reset", String(result.resetMs));

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
