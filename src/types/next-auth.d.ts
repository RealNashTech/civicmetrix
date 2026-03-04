import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "EDITOR" | "VIEWER";
      organizationId: string;
      organizationSlug: string;
      userType?: "staff" | "citizen";
      citizenId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "EDITOR" | "VIEWER";
    organizationId: string;
    organizationSlug: string;
    userType?: "staff" | "citizen";
    citizenId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "EDITOR" | "VIEWER";
    organizationId?: string;
    organizationSlug?: string;
    userType?: "staff" | "citizen";
    citizenId?: string | null;
  }
}
