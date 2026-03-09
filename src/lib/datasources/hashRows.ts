import crypto from "crypto";

export function hashRows(rows: Record<string, unknown>[]) {
  const json = JSON.stringify(rows);
  return crypto.createHash("sha256").update(json).digest("hex");
}
