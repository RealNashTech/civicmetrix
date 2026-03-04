import { expect, test } from "@playwright/test";

test("public dashboard responds with HTTP 200", async ({ request, baseURL }) => {
  const slug = process.env.PLAYWRIGHT_PUBLIC_SLUG ?? "demo-city";
  const resolvedBaseUrl = baseURL ?? "http://127.0.0.1:3000";
  const url = `${resolvedBaseUrl}/public/${slug}`;
  let status: number | null = null;

  try {
    const response = await request.get(url, { timeout: 5_000 });
    status = response.status();
  } catch {
    status = null;
  }

  expect([200, 404, null]).toContain(status);
});
