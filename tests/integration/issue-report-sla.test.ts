import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  eventFindManyMock,
  eventUpdateManyMock,
  issueFindUniqueMock,
  issueUpdateManyMock,
  slaPolicyFindFirstMock,
} = vi.hoisted(() => ({
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

import { runEventWorker } from "@/workers/event-worker";

describe("issue report SLA integration flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assigns SLA deadlines after ISSUE_REPORT_CREATE event", async () => {
    let eventFetchCount = 0;
    eventFindManyMock.mockImplementation(async () => {
      eventFetchCount += 1;
      if (eventFetchCount === 1) {
        return [
          {
            id: "evt_1",
            type: "ISSUE_REPORT_CREATE",
            entityType: "ISSUE_REPORT",
            entityId: "issue_1",
            organizationId: "org_1",
          },
        ];
      }
      return [];
    });

    issueFindUniqueMock.mockResolvedValueOnce({
      id: "issue_1",
      organizationId: "org_1",
      category: "Roads",
    });
    slaPolicyFindFirstMock.mockResolvedValueOnce({
      responseHours: 1,
      resolutionHours: 6,
    });
    issueUpdateManyMock.mockResolvedValueOnce({ count: 1 });
    eventUpdateManyMock.mockResolvedValue({ count: 1 });

    await runEventWorker(100);

    expect(issueUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "issue_1",
          organizationId: "org_1",
        },
        data: {
          slaResponseDueAt: expect.any(Date),
          slaResolutionDueAt: expect.any(Date),
        },
      }),
    );
    expect(eventUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: ["evt_1"] },
        processed: false,
      },
      data: {
        processed: true,
        processedAt: expect.any(Date),
      },
    });
  });
});
