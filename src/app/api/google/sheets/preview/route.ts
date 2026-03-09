import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { z } from "zod";

import { apiError } from "@/lib/api/error-response";
import { getSystemDb } from "@/lib/db/systemClient";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError, requireStaffUser } from "@/lib/security/authorization";

const previewSchema = z.object({
  spreadsheetId: z.string().trim().min(1),
  sheetName: z.string().trim().min(1),
  range: z.string().trim().min(1).optional(),
});

function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured.");
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

function headerName(value: unknown, index: number): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return `Column ${index + 1}`;
}

async function handlePost(request: Request) {
  try {
    const user = await requireStaffUser("VIEWER");
    const body = await request.json();
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid request body.", 400);
    }

    const systemDb = getSystemDb();
    const integration = await systemDb.googleIntegration.findUnique({
      where: { organizationId: user.organizationId },
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
    const isExpired = integration.expiryDate
      ? integration.expiryDate.getTime() <= Date.now()
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

    const sheets = google.sheets({
      version: "v4",
      auth: oauthClient,
    });

    const range =
      parsed.data.range && parsed.data.range.trim().length > 0
        ? parsed.data.range.trim()
        : `${parsed.data.sheetName}!A1:ZZ20`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: parsed.data.spreadsheetId,
      range,
    });

    const values = response.data.values ?? [];
    if (values.length === 0) {
      return Response.json({
        columns: [],
        rows: [],
      });
    }

    const columns = values[0].map((value, index) => headerName(value, index));
    const rows = values.slice(1, 21).map((row) => {
      const mapped: Record<string, unknown> = {};
      columns.forEach((column, index) => {
        mapped[column] = row[index] ?? null;
      });
      return mapped;
    });

    return Response.json({
      columns,
      rows,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }
    return apiError("Failed to preview Google Sheet.", 500);
  }
}

export const POST = withApiObservability("/api/google/sheets/preview", "POST", handlePost);
