import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  });

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
