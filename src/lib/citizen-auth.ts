import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

type CitizenSessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  organizationId: string;
  organizationSlug: string;
  role: "VIEWER";
  userType: "citizen";
  citizenId: string;
};

export async function requireCitizenSession(): Promise<CitizenSessionUser> {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/citizen/login");
  }

  if (user.userType !== "citizen" || !user.citizenId) {
    redirect("/auth/login");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
    organizationSlug: user.organizationSlug,
    role: "VIEWER",
    userType: "citizen",
    citizenId: user.citizenId,
  };
}
