import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { globalLimiter } from "@/lib/rate-limit";
import { hasAnyRole } from "@/lib/role-checks";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

function withSecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = crypto.randomUUID();
  const shouldRateLimit =
    pathname.startsWith("/api") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/citizen");

  if (shouldRateLimit) {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? "anonymous";
    const { success } = await globalLimiter.limit(ip);

    if (!success) {
      return withSecurityHeaders(new NextResponse("Too Many Requests", { status: 429 }), nonce);
    }
  }

  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);
  const tokenOrganizationId = token?.organizationId as string | undefined;
  if (tokenOrganizationId) {
    requestHeaders.set("x-civicmetrix-tenant", tokenOrganizationId);
  }

  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/auth/login", req.url)), nonce);
    }

    const tokenRole = token.role as string | undefined;
    const tokenUserType = token.userType as string | undefined;
    const isStaffRole = tokenRole === "ADMIN" || tokenRole === "EDITOR" || tokenRole === "VIEWER";
    const isStaff = tokenUserType ? tokenUserType === "staff" : isStaffRole;

    if (!isStaff) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/citizen/dashboard", req.url)), nonce);
    }

    const roleRules: Array<{ prefix: string; roles: string[] }> = [
      {
        prefix: "/dashboard/organization",
        roles: ["SYSTEM_ADMIN", "CITY_ADMIN"],
      },
      {
        prefix: "/dashboard/work-orders",
        roles: ["SYSTEM_ADMIN", "CITY_ADMIN", "DEPARTMENT_ADMIN", "STAFF"],
      },
      {
        prefix: "/dashboard/reports",
        roles: ["SYSTEM_ADMIN", "CITY_ADMIN", "COUNCIL_MEMBER"],
      },
      {
        prefix: "/dashboard/insights",
        roles: ["SYSTEM_ADMIN", "CITY_ADMIN", "COUNCIL_MEMBER"],
      },
      {
        prefix: "/dashboard/data-browser",
        roles: ["SYSTEM_ADMIN", "CITY_ADMIN", "DEPARTMENT_ADMIN"],
      },
      {
        prefix: "/dashboard/data/import-gis",
        roles: ["SYSTEM_ADMIN", "CITY_ADMIN", "DEPARTMENT_ADMIN"],
      },
      {
        prefix: "/dashboard/system/health",
        roles: ["SYSTEM_ADMIN", "CITY_ADMIN"],
      },
    ];

    const matchingRule = roleRules.find((rule) => pathname.startsWith(rule.prefix));
    if (matchingRule && !hasAnyRole(token as { role?: string }, matchingRule.roles)) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/dashboard", req.url)), nonce);
    }
  }

  return withSecurityHeaders(NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  }), nonce);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/public/:path*",
    "/auth/:path*",
    "/citizen/:path*",
  ],
};
