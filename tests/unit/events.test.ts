import { beforeEach, describe, expect, it, vi } from "vitest";

const { eventCreateMock } = vi.hoisted(() => ({
  eventCreateMock: vi.fn(),
}));

const { getTenantContextMock, getTenantIdFromRequestHeadersMock } = vi.hoisted(() => ({
  getTenantContextMock: vi.fn(),
  getTenantIdFromRequestHeadersMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    event: {
      create: eventCreateMock,
    },
  },
}));

vi.mock("@/lib/tenant-context", () => ({
  getTenantContext: getTenantContextMock,
  getTenantIdFromRequestHeaders: getTenantIdFromRequestHeadersMock,
}));

import { createEvent } from "@/lib/events";

describe("createEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTenantContextMock.mockReturnValue({
      organizationId: "org_1",
      principalType: "staff",
      principalId: "user_1",
      role: "ADMIN",
    });
    getTenantIdFromRequestHeadersMock.mockResolvedValue(null);
  });

  it("creates an event with required fields", async () => {
    const now = new Date();
    eventCreateMock.mockResolvedValueOnce({
      id: "evt_1",
      organizationId: "org_1",
      type: "KPI_CREATE",
      entityType: "KPI",
      createdAt: now,
    });

    const result = await createEvent({
      organizationId: "org_1",
      type: "KPI_CREATE",
      entityType: "KPI",
      entityId: "kpi_1",
      payload: { value: 100 },
    });

    expect(eventCreateMock).toHaveBeenCalledWith({
      data: {
        organizationId: "org_1",
        type: "KPI_CREATE",
        entityType: "KPI",
        entityId: "kpi_1",
        payload: { value: 100 },
      },
    });
    expect(result.id).toBe("evt_1");
  });

  it("normalizes optional fields", async () => {
    eventCreateMock.mockResolvedValueOnce({ id: "evt_2" });

    await createEvent({
      organizationId: "org_2",
      type: "KPI_DELETE",
      entityType: "KPI",
    });

    expect(eventCreateMock).toHaveBeenCalledWith({
      data: {
        organizationId: "org_2",
        type: "KPI_DELETE",
        entityType: "KPI",
        entityId: null,
        payload: undefined,
      },
    });
  });
});
