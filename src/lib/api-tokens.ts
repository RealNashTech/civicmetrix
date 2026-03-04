import { validateApiToken } from "@/lib/api-token-service";

export async function getOrganizationIdFromApiToken(
  token: string | null | undefined,
): Promise<string | null> {
  const validated = await validateApiToken(token);
  return validated?.organizationId ?? null;
}

export function getBearerTokenFromHeader(
  authorizationHeader: string | null | undefined,
): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, credentials] = authorizationHeader.split(" ", 2);
  if (scheme !== "Bearer" || !credentials) {
    return null;
  }

  return credentials.trim() || null;
}

export async function getOrganizationIdFromBearerHeader(
  authorizationHeader: string | null | undefined,
): Promise<string | null> {
  const bearerToken = getBearerTokenFromHeader(authorizationHeader);
  return getOrganizationIdFromApiToken(bearerToken);
}
