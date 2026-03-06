import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  const tokenOrganizationId = token?.organizationId as string | undefined;
  if (tokenOrganizationId) {
    requestHeaders.set("x-civicmetrix-tenant", tokenOrganizationId);
  }

  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    const tokenRole = token.role as string | undefined;
    const tokenUserType = token.userType as string | undefined;
    const isStaffRole = tokenRole === "ADMIN" || tokenRole === "EDITOR" || tokenRole === "VIEWER";
    const isStaff = tokenUserType ? tokenUserType === "staff" : isStaffRole;

    if (!isStaff) {
      return NextResponse.redirect(new URL("/citizen/dashboard", req.url));
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
