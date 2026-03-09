import { google } from "googleapis";

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

export async function fetchGoogleSheetRows(spreadsheetId: string, range: string) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID;

  if (!clientEmail || !privateKey) {
    throw new Error("Google Sheets credentials are not configured.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
      client_id: clientId,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({
    version: "v4",
    auth,
  });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    majorDimension: "ROWS",
  });

  const values = response.data.values ?? [];
  if (values.length === 0) {
    return [] as Array<Record<string, unknown>>;
  }

  const headers = ensureUniqueHeaders(values[0].map((value, index) => normalizeHeader(value, index)));
  const rows = values.slice(1);

  return rows.map((row) => {
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? null;
    });
    return record;
  });
}
