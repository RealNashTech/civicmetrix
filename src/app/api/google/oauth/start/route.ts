import { randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api/error-response";
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

async function handleGet() {
  try {
    await requireStaffUser("VIEWER");

    const oauthClient = createOAuthClient();
    const state = randomBytes(24).toString("hex");
    const url = oauthClient.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      ],
      state,
    });

    const response = NextResponse.redirect(url);
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to start Google OAuth flow.", 500);
  }
}

export const GET = withApiObservability("/api/google/oauth/start", "GET", handleGet);
