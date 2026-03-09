import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

import { apiError } from "@/lib/api/error-response";
import { getSystemDb } from "@/lib/db/systemClient";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

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
    const user = await requireStaffUser("VIEWER");
    const organizationId = user.organizationId;
    const systemDb = getSystemDb();
    const integration = await systemDb.googleIntegration.findUnique({
      where: { organizationId },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        expiryDate: true,
      },
    });

    if (!integration) {
      return Response.json({ error: "google_not_connected" }, { status: 404 });
    }

    let accessToken = integration.accessToken;
    let refreshToken = integration.refreshToken ?? undefined;
    const now = Date.now();
    const isExpired = integration.expiryDate
      ? integration.expiryDate.getTime() <= now
      : false;

    const oauthClient = createOAuthClient();
    if (isExpired) {
      if (!refreshToken) {
        return Response.json({ error: "google_not_connected" }, { status: 401 });
      }

      oauthClient.setCredentials({
        refresh_token: refreshToken,
      });
      const refreshed = await oauthClient.refreshAccessToken();
      const refreshedToken = refreshed.credentials.access_token;
      if (!refreshedToken) {
        return Response.json({ error: "google_not_connected" }, { status: 401 });
      }

      accessToken = refreshedToken;
      refreshToken = refreshed.credentials.refresh_token ?? refreshToken;

      await systemDb.googleIntegration.update({
        where: { id: integration.id },
        data: {
          accessToken,
          refreshToken,
          expiryDate: refreshed.credentials.expiry_date
            ? new Date(refreshed.credentials.expiry_date)
            : null,
        },
      });
    }

    oauthClient.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const drive = google.drive({
      version: "v3",
      auth: oauthClient,
    });

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed = false",
      fields: "files(id,name)",
      pageSize: 100,
      orderBy: "modifiedTime desc",
    });

    const spreadsheets = (response.data.files ?? [])
      .filter((file) => Boolean(file.id) && Boolean(file.name))
      .map((file) => ({
        id: file.id as string,
        name: file.name as string,
      }));

    return Response.json({
      success: true,
      spreadsheets,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to fetch Google spreadsheets.", 500);
  }
}

export const GET = withApiObservability("/api/google/sheets", "GET", handleGet);
