import { AuthorizationError } from "@/lib/policies/base";
import { enforceRateLimitByIdentifier } from "@/lib/security/rate-limit";

export async function rateLimit(ip: string) {
  try {
    await enforceRateLimitByIdentifier("issue submit", ip || "unknown");
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 429) {
      throw new Error("Rate limit exceeded");
    }
    throw error;
  }
}
