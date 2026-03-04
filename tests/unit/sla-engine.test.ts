import { beforeEach, describe, expect, it, vi } from "vitest";

const { slaPolicyFindFirstMock } = vi.hoisted(() => ({
  slaPolicyFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    sLAPolicy: {
      findFirst: slaPolicyFindFirstMock,
    },
  },
}));

import { calculateIssueSLA } from "@/lib/sla-engine";

describe("calculateIssueSLA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns deadlines when matching policy exists", async () => {
    slaPolicyFindFirstMock.mockResolvedValueOnce({
      responseHours: 2,
      resolutionHours: 8,
    });
    const start = Date.now();

    const result = await calculateIssueSLA({
      id: "iss_1",
      organizationId: "org_1",
      category: "Roads",
    });

    expect(result).not.toBeNull();
    expect(slaPolicyFindFirstMock).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        issueCategory: "Roads",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        responseHours: true,
        resolutionHours: true,
      },
    });

    const responseDelta = (result?.responseDueAt.getTime() ?? 0) - start;
    const resolutionDelta = (result?.resolutionDueAt.getTime() ?? 0) - start;
    expect(responseDelta).toBeGreaterThanOrEqual(2 * 60 * 60 * 1000 - 2_000);
    expect(resolutionDelta).toBeGreaterThanOrEqual(8 * 60 * 60 * 1000 - 2_000);
  });

  it("returns null when no policy exists", async () => {
    slaPolicyFindFirstMock.mockResolvedValueOnce(null);

    const result = await calculateIssueSLA({
      id: "iss_2",
      organizationId: "org_2",
      category: "Sanitation",
    });

    expect(result).toBeNull();
  });
});
