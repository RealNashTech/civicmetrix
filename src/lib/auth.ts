import { compare } from "bcryptjs";
import { getServerSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { z } from "zod";

import { validateEnv } from "@/lib/config/env";
import { dbSystem } from "@/lib/db";
import { setObservabilityContext } from "@/lib/observability/context";
import { consumeLoginRateLimit, penalizeLoginRateLimit } from "@/lib/security/login-rate-limit";
import { setTenantContext } from "@/lib/tenant-context";

validateEnv();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationSlug: z.string().min(2),
});
const citizenCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationSlug: z.string().min(2),
});

function getRequestIp(rawHeaders: unknown): string {
  if (!rawHeaders || typeof rawHeaders !== "object") {
    return "unknown";
  }

  const headers = rawHeaders as Record<string, string | string[] | undefined>;
  const forwarded = headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (forwardedValue) {
    return forwardedValue.split(",")[0]?.trim() || "unknown";
  }

  const realIp = headers["x-real-ip"];
  const realIpValue = Array.isArray(realIp) ? realIp[0] : realIp;
  return realIpValue?.trim() || "unknown";
}

function isRateLimitError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "msBeforeNext" in error &&
      typeof (error as { msBeforeNext?: unknown }).msBeforeNext === "number",
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      id: "staff-credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        organizationSlug: { label: "Organization Slug", type: "text" },
      },
      async authorize(rawCredentials, req) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const ip = getRequestIp(req?.headers);
        try {
          await consumeLoginRateLimit(ip);
        } catch (error) {
          if (isRateLimitError(error)) {
            throw new Error("Too many login attempts. Try again later.");
          }
        }

        const { email, password, organizationSlug } = parsed.data;

        const user = await dbSystem().user.findFirst({
          where: {
            email: email.toLowerCase(),
            organization: {
              slug: organizationSlug.toLowerCase(),
            },
          },
          include: {
            organization: true,
          },
        });

        if (!user) {
          await penalizeLoginRateLimit(ip);
          return null;
        }

        const validPassword = await compare(password, user.passwordHash);
        if (!validPassword) {
          await penalizeLoginRateLimit(ip);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationSlug: user.organization.slug,
          userType: "staff",
          citizenId: null,
        };
      },
    }),
    CredentialsProvider({
      id: "citizen-credentials",
      name: "Citizen Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        organizationSlug: { label: "Organization Slug", type: "text" },
      },
      async authorize(rawCredentials, req) {
        const parsed = citizenCredentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const ip = getRequestIp(req?.headers);
        try {
          await consumeLoginRateLimit(ip);
        } catch (error) {
          if (isRateLimitError(error)) {
            throw new Error("Too many login attempts. Try again later.");
          }
        }

        const { email, password, organizationSlug } = parsed.data;
        const citizen = await dbSystem().citizen.findFirst({
          where: {
            email: email.toLowerCase(),
            organization: {
              slug: organizationSlug.toLowerCase(),
            },
          },
          include: {
            organization: true,
          },
        });

        if (!citizen) {
          await penalizeLoginRateLimit(ip);
          return null;
        }

        const validPassword = await compare(password, citizen.passwordHash);
        if (!validPassword) {
          await penalizeLoginRateLimit(ip);
          return null;
        }

        return {
          id: citizen.id,
          email: citizen.email,
          name: citizen.name ?? citizen.email,
          role: "VIEWER",
          organizationId: citizen.organizationId,
          organizationSlug: citizen.organization.slug,
          userType: "citizen",
          citizenId: citizen.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationSlug = user.organizationSlug;
        token.userType = (user.userType as "staff" | "citizen" | undefined) ?? "staff";
        token.citizenId = (user.citizenId as string | null | undefined) ?? null;
      } else if (!token.userType) {
        token.userType = "staff";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role ?? "VIEWER") as
          | "ADMIN"
          | "EDITOR"
          | "VIEWER";
        session.user.organizationId = (token.organizationId as string) ?? "";
        session.user.organizationSlug = (token.organizationSlug as string) ?? "";
        session.user.userType = (token.userType as "staff" | "citizen" | undefined) ?? "staff";
        session.user.citizenId = (token.citizenId as string | null | undefined) ?? null;
      }
      return session;
    },
  },
};

export async function auth() {
  try {
    const headerStore = await headers();
    const requestId = headerStore.get("x-request-id");
    if (requestId) {
      setObservabilityContext({
        requestId,
        tenantId: headerStore.get("x-civicmetrix-tenant") ?? undefined,
        route:
          headerStore.get("next-url") ??
          headerStore.get("x-invoke-path") ??
          undefined,
      });
    }
  } catch {
    // No request header context available (e.g. worker/background process).
  }

  const session = await getServerSession(authOptions);
  const organizationId = session?.user?.organizationId;

  if (organizationId && session?.user?.id && session.user.userType !== "citizen") {
    setTenantContext({
      organizationId,
      principalType: "staff",
      principalId: session.user.id,
      role: session.user.role,
    });

    setObservabilityContext({
      tenantId: organizationId,
      userId: session.user.id,
    });
  }

  return session;
}
