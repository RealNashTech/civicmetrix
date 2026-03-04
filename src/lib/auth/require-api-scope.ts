import { validateApiToken } from "@/lib/api-token-service";
import { getBearerTokenFromHeader } from "@/lib/api-tokens";
import { AuthError } from "@/lib/auth/require-staff";

function hasScope(scopeValue: string, requiredScope: string) {
  const scopes = scopeValue
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (scopes.includes("*") || scopes.includes(requiredScope)) {
    return true;
  }

  const [requiredResource] = requiredScope.split(":");
  return scopes.includes(`${requiredResource}:*`);
}

export async function requireApiScope(request: Request, requiredScope: string) {
  const token = getBearerTokenFromHeader(request.headers.get("authorization"));

  if (!token) {
    throw new AuthError(401, "Missing API token.");
  }

  const validated = await validateApiToken(token);
  if (!validated) {
    throw new AuthError(401, "Invalid API token.");
  }

  if (!hasScope(validated.scope, requiredScope)) {
    throw new AuthError(403, "Insufficient API token scope.");
  }

  return validated;
}
