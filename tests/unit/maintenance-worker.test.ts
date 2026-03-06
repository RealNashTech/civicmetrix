import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  maintenanceFindManyMock,
  workOrderFindManyMock,
  workOrderCreateManyMock,
  notifyOrganizationEditorsMock,
} = vi.hoisted(() => ({
  maintenanceFindManyMock: vi.fn(),
  workOrderFindManyMock: vi.fn(),
  workOrderCreateManyMock: vi.fn(),
  notifyOrganizationEditorsMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    maintenanceSchedule: {
      findMany: maintenanceFindManyMock,
    },
    workOrder: {
      findMany: workOrderFindManyMock,
      createMany: workOrderCreateManyMock,
    },
  },
}));

vi.mock("@/lib/notifications", () => ({
  notifyOrganizationEditors: notifyOrganizationEditorsMock,
}));

import { runMaintenanceSchedulerWorker } from "@/workers/maintenance-scheduler-worker";

describe("maintenance scheduler worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workOrderCreateManyMock.mockResolvedValue({ count: 0 });
    workOrderFindManyMock.mockResolvedValue([]);
  });

  it("maintenance schedules generate work orders when due", async () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    maintenanceFindManyMock.mockResolvedValueOnce([
      {
        id: "sched_1",
        organizationId: "org_1",
        assetId: "asset_1",
        name: "Pump Inspection",
        frequencyDays: 7,
        lastCompleted: oldDate,
        createdAt: oldDate,
        asset: { id: "asset_1", name: "Pump A", departmentId: "dept_1" },
      },
    ]);

    await runMaintenanceSchedulerWorker();

    expect(workOrderCreateManyMock).toHaveBeenCalledTimes(1);
  });

  it("existing open work orders prevent duplicates", async () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    maintenanceFindManyMock.mockResolvedValueOnce([
      {
        id: "sched_2",
        organizationId: "org_1",
        assetId: "asset_1",
        name: "Valve Check",
        frequencyDays: 7,
        lastCompleted: oldDate,
        createdAt: oldDate,
        asset: { id: "asset_1", name: "Valve A", departmentId: "dept_1" },
      },
    ]);
    workOrderFindManyMock.mockResolvedValueOnce([
      {
        organizationId: "org_1",
        assetId: "asset_1",
        title: "Preventive Maintenance: Valve Check",
      },
    ]);

    await runMaintenanceSchedulerWorker();

    expect(workOrderCreateManyMock).not.toHaveBeenCalled();
  });

  it("batch creation uses createMany", async () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    maintenanceFindManyMock.mockResolvedValueOnce([
      {
        id: "sched_3",
        organizationId: "org_1",
        assetId: "asset_1",
        name: "Road Sensor",
        frequencyDays: 14,
        lastCompleted: oldDate,
        createdAt: oldDate,
        asset: { id: "asset_1", name: "Sensor 1", departmentId: "dept_1" },
      },
      {
        id: "sched_4",
        organizationId: "org_2",
        assetId: "asset_2",
        name: "Water Meter",
        frequencyDays: 14,
        lastCompleted: oldDate,
        createdAt: oldDate,
        asset: { id: "asset_2", name: "Meter 2", departmentId: "dept_2" },
      },
    ]);

    await runMaintenanceSchedulerWorker();

    expect(workOrderCreateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        skipDuplicates: true,
      }),
    );
  });

  it("notifications sent once per organization", async () => {
    const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    maintenanceFindManyMock.mockResolvedValueOnce([
      {
        id: "sched_5",
        organizationId: "org_1",
        assetId: "asset_10",
        name: "Pump 1",
        frequencyDays: 7,
        lastCompleted: oldDate,
        createdAt: oldDate,
        asset: { id: "asset_10", name: "Pump 1", departmentId: "dept_1" },
      },
      {
        id: "sched_6",
        organizationId: "org_1",
        assetId: "asset_11",
        name: "Pump 2",
        frequencyDays: 7,
        lastCompleted: oldDate,
        createdAt: oldDate,
        asset: { id: "asset_11", name: "Pump 2", departmentId: "dept_1" },
      },
    ]);

    await runMaintenanceSchedulerWorker();

    expect(notifyOrganizationEditorsMock).toHaveBeenCalledTimes(1);
    expect(notifyOrganizationEditorsMock).toHaveBeenCalledWith(
      "org_1",
      "Preventive maintenance work orders generated",
      "/dashboard/work-orders",
      expect.anything(),
    );
  });

  it("schedules outside due window ignored", async () => {
    const recentDate = new Date();
    maintenanceFindManyMock.mockResolvedValueOnce([
      {
        id: "sched_7",
        organizationId: "org_3",
        assetId: "asset_3",
        name: "Recent Schedule",
        frequencyDays: 30,
        lastCompleted: recentDate,
        createdAt: recentDate,
        asset: { id: "asset_3", name: "Asset 3", departmentId: "dept_3" },
      },
    ]);

    await runMaintenanceSchedulerWorker();

    expect(workOrderCreateManyMock).not.toHaveBeenCalled();
    expect(notifyOrganizationEditorsMock).not.toHaveBeenCalled();
  });
});
