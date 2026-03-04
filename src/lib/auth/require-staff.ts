import { auth } from "@/lib/auth";

export class AuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireStaff() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    throw new AuthError(401, "Unauthorized.");
  }

  const userType = String(user.userType ?? "").toUpperCase();
  const role = String(user.role ?? "").toUpperCase();
  const isStaff = userType === "STAFF" || role === "ADMIN";

  if (!isStaff) {
    throw new AuthError(403, "Forbidden.");
  }

  return user;
}
