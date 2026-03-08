import { expect, test } from "@playwright/test";

test("public dashboard routes return 200", async ({ request, baseURL }) => {
  const slug = process.env.PLAYWRIGHT_PUBLIC_SLUG ?? "city-of-woodburn";
  const resolvedBaseUrl = baseURL ?? "http://127.0.0.1:3000";
  const routes = [
    `/public/${slug}`,
    `/public/${slug}/kpis`,
    `/public/${slug}/grants`,
    `/public/${slug}/issues`,
  ];

  for (const route of routes) {
    const response = await request.get(`${resolvedBaseUrl}${route}`, { timeout: 10_000 });
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body.toLowerCase()).not.toContain("internal server error");
  }
});

test("public data exports are valid", async ({ request, baseURL }) => {
  const slug = process.env.PLAYWRIGHT_PUBLIC_SLUG ?? "city-of-woodburn";
  const resolvedBaseUrl = baseURL ?? "http://127.0.0.1:3000";

  const kpisResponse = await request.get(`${resolvedBaseUrl}/public/${slug}/kpis.json`, { timeout: 10_000 });
  expect(kpisResponse.status()).toBe(200);
  const kpisJson = await kpisResponse.json();
  expect(Array.isArray(kpisJson.data)).toBe(true);

  const grantsResponse = await request.get(`${resolvedBaseUrl}/public/${slug}/grants.json`, { timeout: 10_000 });
  expect(grantsResponse.status()).toBe(200);
  const grantsJson = await grantsResponse.json();
  expect(Array.isArray(grantsJson.data)).toBe(true);
});
