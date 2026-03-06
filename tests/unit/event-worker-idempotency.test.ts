import { beforeEach, describe, expect, it, vi } from "vitest";

const { eventFindManyMock, eventUpdateManyMock, issueFindUniqueMock, issueUpdateManyMock, slaPolicyFindFirstMock } =
  vi.hoisted(() => ({
    eventFindManyMock: vi.fn(),
    eventUpdateManyMock: vi.fn(),
    issueFindUniqueMock: vi.fn(),
    issueUpdateManyMock: vi.fn(),
    slaPolicyFindFirstMock: vi.fn(),
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
    sLAPolicy: {
      findFirst: slaPolicyFindFirstMock,
    },
  },
}));

import { processEventBatch } from "@/workers/event-worker";

describe("event worker idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks events processed in a single guarded updateMany", async () => {
    eventFindManyMock.mockResolvedValueOnce([
      {
        id: "evt_1",
        type: "ISSUE_REPORT_CREATE",
        entityType: "ISSUE_REPORT",
        entityId: "issue_1",
        organizationId: "org_1",
      },
      {
        id: "evt_2",
        type: "ISSUE_REPORT_CREATE",
        entityType: "ISSUE_REPORT",
        entityId: "issue_2",
        organizationId: "org_1",
      },
    ]);
    issueFindUniqueMock.mockResolvedValue({ id: "issue_1", organizationId: "org_1", category: "Roads" });
    slaPolicyFindFirstMock.mockResolvedValue({ responseHours: 1, resolutionHours: 4 });
    issueUpdateManyMock.mockResolvedValue({ count: 1 });
    eventUpdateManyMock.mockResolvedValue({ count: 2 });

    const count = await processEventBatch(100);

    expect(count).toBe(2);
    expect(eventUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(eventUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ["evt_1", "evt_2"] },
          processed: false,
        },
      }),
    );
  });
});
