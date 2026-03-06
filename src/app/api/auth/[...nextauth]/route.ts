import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";
import { withApiObservability } from "@/lib/observability/http";

const handler = NextAuth(authOptions);

export const GET = withApiObservability("/api/auth/[...nextauth]", "GET", handler);
export const POST = withApiObservability("/api/auth/[...nextauth]", "POST", handler);
