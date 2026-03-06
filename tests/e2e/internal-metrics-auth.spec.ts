import { expect, test } from "@playwright/test";

test("internal metrics endpoint is not publicly accessible", async ({ request, baseURL }) => {
  const resolvedBaseUrl = baseURL ?? "http://127.0.0.1:3000";
  const url = `${resolvedBaseUrl}/api/internal/metrics`;

  let status: number | null = null;
  try {
    const response = await request.get(url, { timeout: 5_000 });
    status = response.status();
  } catch {
    status = null;
  }

  expect([401, 403, 404, null]).toContain(status);
});
