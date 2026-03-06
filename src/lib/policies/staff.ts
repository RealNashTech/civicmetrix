import { auth } from "@/lib/auth";
import { AppRole } from "@/types/roles";

import { assertAuthenticated, assertRole, assertStaff, StaffPrincipal } from "./base";

export type AuthorizedStaff = StaffPrincipal;

export async function requireStaff(minimumRole: AppRole = "VIEWER"): Promise<AuthorizedStaff> {
  const session = await auth();
  const user = session?.user as StaffPrincipal | undefined;

  assertAuthenticated(user);
  assertStaff(user);
  assertRole(user, minimumRole);

  return user;
}
