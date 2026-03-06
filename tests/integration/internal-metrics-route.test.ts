import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authorizeStaffOrApiScopeMock,
  enforceRateLimitMock,
  getMetricsSnapshotMock,
  getJobCountsMock,
} = vi.hoisted(() => ({
  authorizeStaffOrApiScopeMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  getMetricsSnapshotMock: vi.fn(),
  getJobCountsMock: vi.fn(),
}));

vi.mock("@/lib/security/authorization", () => ({
  authorizeStaffOrApiScope: authorizeStaffOrApiScopeMock,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock,
}));

vi.mock("@/lib/observability/metrics", () => ({
  getMetricsSnapshot: getMetricsSnapshotMock,
}));

vi.mock("@/lib/queue", () => {
  const queue = { getJobCounts: getJobCountsMock };
  return {
    eventProcessingQueue: queue,
    grantRemindersQueue: queue,
    issueSlaQueue: queue,
    maintenanceSchedulerQueue: queue,
    civicIntelligenceQueue: queue,
    deadLetterQueue: queue,
  };
});

vi.mock("@/lib/observability/http", () => ({
  withApiObservability: (_route: string, _method: string, handler: (request: Request) => Promise<Response>) =>
    handler,
}));

import { AuthorizationError } from "@/lib/policies/base";
import { GET } from "@/app/api/internal/metrics/route";

describe("internal metrics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizeStaffOrApiScopeMock.mockResolvedValue({ organizationId: "org_1" });
    enforceRateLimitMock.mockResolvedValue(undefined);
    getJobCountsMock.mockResolvedValue({ waiting: 1, active: 0, completed: 10, failed: 0, delayed: 0 });
    getMetricsSnapshotMock.mockReturnValue({
      db: { queryCount: 10, averageLatencyMs: 5, slowQueryCount: 0 },
      apiRequestCounts: { "/api/internal/metrics": 1 },
      apiErrorCounts: {},
    });
  });

  it("request without auth returns 401", async () => {
    authorizeStaffOrApiScopeMock.mockRejectedValueOnce(new AuthorizationError(401, "Unauthorized."));

    const response = await GET(new Request("http://localhost/api/internal/metrics"));

    expect(response.status).toBe(401);
  });

  it("request with invalid scope returns 403", async () => {
    authorizeStaffOrApiScopeMock.mockRejectedValueOnce(new AuthorizationError(403, "Forbidden."));

    const response = await GET(new Request("http://localhost/api/internal/metrics"));

    expect(response.status).toBe(403);
  });

  it("ADMIN role can access metrics", async () => {
    authorizeStaffOrApiScopeMock.mockResolvedValueOnce({
      organizationId: "org_1",
      principalType: "staff",
      role: "ADMIN",
    });

    const response = await GET(new Request("http://localhost/api/internal/metrics"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        workerQueueSizes: expect.any(Object),
        dbQueryLatency: expect.any(Object),
      }),
    );
  });

  it("valid API scope system:metrics:read returns metrics payload", async () => {
    authorizeStaffOrApiScopeMock.mockResolvedValueOnce({
      organizationId: "org_2",
      principalType: "api-token",
      scope: "system:metrics:read",
    });

    const response = await GET(new Request("http://localhost/api/internal/metrics"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.workerQueueSizes).toBeTruthy();
    expect(body.dbQueryLatency).toEqual({ queryCount: 10, averageLatencyMs: 5, slowQueryCount: 0 });
  });

  it("rate limit enforced on endpoint", async () => {
    enforceRateLimitMock.mockRejectedValueOnce(new AuthorizationError(429, "Rate limit exceeded."));

    const response = await GET(new Request("http://localhost/api/internal/metrics"));

    expect(response.status).toBe(429);
  });
});
