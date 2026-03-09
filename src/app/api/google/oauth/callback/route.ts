import { OAuth2Client } from "google-auth-library";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api/error-response";
import { getSystemDb } from "@/lib/db/systemClient";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured.");
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

async function handleGet(request: Request) {
  try {
    const user = await requireStaffUser("VIEWER");
    const organizationId = user.organizationId;
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const cookieStore = await cookies();
    const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

    if (!code) {
      return apiError("Missing authorization code.", 400);
    }
    if (!returnedState || !expectedState || returnedState !== expectedState) {
      return apiError("Invalid OAuth state.", 400);
    }

    const oauthClient = createOAuthClient();
    const { tokens } = await oauthClient.getToken(code);
    if (!tokens.access_token) {
      return apiError("Google OAuth did not return an access token.", 400);
    }

    const systemDb = getSystemDb();
    await systemDb.googleIntegration.upsert({
      where: { organizationId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      create: {
        organizationId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    const redirect = NextResponse.redirect(
      new URL("/dashboard/datasources/connect?google=connected", request.url),
    );

    redirect.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return redirect;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to complete Google OAuth flow.", 500);
  }
}

export const GET = withApiObservability("/api/google/oauth/callback", "GET", handleGet);
