import "isomorphic-fetch";

import { Client } from "@microsoft/microsoft-graph-client";

function normalizeHeader(value: unknown, index: number): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return `column_${index + 1}`;
}

function ensureUniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header) => {
    const count = seen.get(header) ?? 0;
    seen.set(header, count + 1);
    return count === 0 ? header : `${header}_${count + 1}`;
  });
}

async function getMicrosoftGraphAccessToken() {
  const clientId = process.env.MICROSOFT_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_GRAPH_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft Graph credentials are not configured.");
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`Failed to authenticate with Microsoft Graph (${tokenResponse.status}): ${body}`);
  }

  const tokenJson = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error("Microsoft Graph token response did not include an access token.");
  }

  return tokenJson.access_token;
}

export async function fetchExcelRows(workbookId: string, sheetName: string) {
  const accessToken = await getMicrosoftGraphAccessToken();
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });

  const path = `/drive/items/${encodeURIComponent(workbookId)}/workbook/worksheets/${encodeURIComponent(sheetName)}/usedRange`;
  const response = (await client.api(path).get()) as { values?: unknown[][] };
  const values = response.values ?? [];

  if (values.length === 0) {
    return [] as Array<Record<string, unknown>>;
  }

  const headerRow = Array.isArray(values[0]) ? values[0] : [];
  const headers = ensureUniqueHeaders(headerRow.map((value, index) => normalizeHeader(value, index)));
  const rows = values.slice(1);

  return rows.map((row) => {
    const rowArray = Array.isArray(row) ? row : [];
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      record[header] = rowArray[index] ?? null;
    });
    return record;
  });
}
