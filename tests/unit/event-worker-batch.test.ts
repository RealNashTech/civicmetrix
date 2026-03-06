import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  eventFindManyMock,
  eventUpdateManyMock,
  issueFindUniqueMock,
  issueUpdateManyMock,
  calculateIssueSlaMock,
} = vi.hoisted(() => ({
  eventFindManyMock: vi.fn(),
  eventUpdateManyMock: vi.fn(),
  issueFindUniqueMock: vi.fn(),
  issueUpdateManyMock: vi.fn(),
  calculateIssueSlaMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    event: {
      findMany: eventFindManyMock,
      updateMany: eventUpdateManyMock,
    },
    issueReport: {
      findUnique: issueFindUniqueMock,
      updateMany: issueUpdateManyMock,
    },
  },
}));

vi.mock("@/lib/sla-engine", () => ({
  calculateIssueSLA: calculateIssueSlaMock,
}));

import { processEventBatch, runEventWorker } from "@/workers/event-worker";

describe("event worker batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventUpdateManyMock.mockResolvedValue({ count: 0 });
    issueUpdateManyMock.mockResolvedValue({ count: 0 });
  });

  it("worker processes batch of events", async () => {
    eventFindManyMock.mockResolvedValueOnce([
      {
        id: "evt_1",
        type: "ISSUE_REPORT_CREATE",
        entityType: "ISSUE_REPORT",
        entityId: "issue_1",
        organizationId: "org_1",
      },
    ]);
    issueFindUniqueMock.mockResolvedValueOnce({
      id: "issue_1",
      organizationId: "org_1",
      category: "Roads",
    });
    calculateIssueSlaMock.mockResolvedValueOnce({
      responseDueAt: new Date(),
      resolutionDueAt: new Date(),
    });

    const processed = await processEventBatch(10);

    expect(processed).toBe(1);
    expect(eventUpdateManyMock).toHaveBeenCalledTimes(1);
  });

  it("processed events marked using updateMany", async () => {
    eventFindManyMock.mockResolvedValueOnce([
      {
        id: "evt_2",
        type: "ISSUE_REPORTED",
        entityType: "ISSUE_REPORT",
        entityId: "issue_2",
        organizationId: "org_1",
      },
    ]);
    issueFindUniqueMock.mockResolvedValueOnce({
      id: "issue_2",
      organizationId: "org_1",
      category: "Roads",
    });
    calculateIssueSlaMock.mockResolvedValueOnce({
      responseDueAt: new Date(),
      resolutionDueAt: new Date(),
    });

    await processEventBatch(5);

    expect(eventUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ["evt_2"] },
          processed: false,
        },
      }),
    );
  });

  it("worker ignores already processed events", async () => {
    eventFindManyMock.mockResolvedValueOnce([]);

    const processed = await processEventBatch(5);

    expect(processed).toBe(0);
    expect(eventUpdateManyMock).not.toHaveBeenCalled();
  });

  it("batch size respected", async () => {
    eventFindManyMock.mockResolvedValueOnce([]);

    await processEventBatch(3);

    expect(eventFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { processed: false },
        take: 3,
      }),
    );
  });

  it("worker handles empty event list safely", async () => {
    eventFindManyMock.mockResolvedValueOnce([]);

    await expect(runEventWorker(10)).resolves.toBeUndefined();
    expect(issueUpdateManyMock).not.toHaveBeenCalled();
  });
});
