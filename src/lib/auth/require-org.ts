import type { Session } from "next-auth";

export function requireOrganization(session: Session | null | undefined) {
  if (!session?.user?.organizationId) {
    throw new Error("Organization context missing");
  }

  return session.user.organizationId;
}
