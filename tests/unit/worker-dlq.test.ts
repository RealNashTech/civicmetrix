import { beforeEach, describe, expect, it, vi } from "vitest";

type QueueCall = {
  queueName: string;
  jobName: string;
  data: unknown;
  options: Record<string, unknown> | undefined;
};

const {
  queueCalls,
  workerInstances,
  QueueMock,
  WorkerMock,
} = vi.hoisted(() => {
  const queueCalls: QueueCall[] = [];
  const workerInstances: Array<{ queueName: string; options: Record<string, unknown>; handlers: Record<string, Function> }> = [];

  class QueueMock {
    name: string;

    constructor(name: string) {
      this.name = name;
    }

    add = vi.fn(async (jobName: string, data: unknown, options?: Record<string, unknown>) => {
      queueCalls.push({ queueName: this.name, jobName, data, options });
      return { id: `${this.name}:${jobName}` };
    });
  }

  class WorkerMock {
    private ref: { queueName: string; options: Record<string, unknown>; handlers: Record<string, Function> };

    constructor(queueName: string, _processor: Function, options: Record<string, unknown>) {
      this.ref = { queueName, options, handlers: {} };
      workerInstances.push(this.ref);
    }

    on(event: string, handler: Function) {
      this.ref.handlers[event] = handler;
      return this;
    }
  }

  return { queueCalls, workerInstances, QueueMock, WorkerMock };
});

vi.mock("bullmq", () => ({
  Queue: QueueMock,
  Worker: WorkerMock,
}));

vi.mock("@/lib/observability/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/observability/context", () => ({
  runWithObservabilityContext: (_ctx: unknown, fn: () => Promise<void>) => fn(),
}));

vi.mock("@/lib/observability/process-errors", () => ({
  installProcessErrorHandlers: vi.fn(),
}));

vi.mock("@/workers/event-worker", () => ({ runEventWorker: vi.fn(async () => undefined) }));
vi.mock("@/workers/grant-deadline-worker", () => ({ runGrantDeadlineWorker: vi.fn(async () => undefined) }));
vi.mock("@/workers/grant-pipeline-refresh-worker", () => ({ runGrantPipelineRefreshWorker: vi.fn(async () => undefined) }));
vi.mock("@/workers/grant-reminder-worker", () => ({ runGrantReminderWorker: vi.fn(async () => undefined) }));
vi.mock("@/workers/intelligence/grant-risk-worker", () => ({ runGrantRiskWorker: vi.fn(async () => undefined) }));
vi.mock("@/workers/intelligence/issue-anomaly-worker", () => ({ runIssueAnomalyWorker: vi.fn(async () => undefined) }));
vi.mock("@/workers/intelligence/kpi-trend-worker", () => ({ runKpiTrendWorker: vi.fn(async () => undefined) }));
vi.mock("@/workers/intelligence/spatial-cluster-worker", () => ({ runSpatialClusterWorker: vi.fn(async () => undefined) }));
vi.mock("@/workers/issue-sla-worker", () => ({ runIssueSlaWorker: vi.fn(async () => undefined) }));
vi.mock("@/workers/maintenance-scheduler-worker", () => ({ runMaintenanceSchedulerWorker: vi.fn(async () => undefined) }));

import { startWorkers } from "@/workers/index";

describe("worker DLQ behavior", () => {
  beforeEach(() => {
    process.env.REDIS_URL = "redis://localhost:6379";
    queueCalls.length = 0;
    workerInstances.length = 0;
    vi.clearAllMocks();
  });

  it("worker pushes failed jobs to dead letter queue", async () => {
    await startWorkers();

    const eventWorker = workerInstances.find((worker) => worker.queueName === "event-processing");
    expect(eventWorker).toBeTruthy();

    eventWorker?.handlers.failed?.({ id: "job-1", name: "run-event-worker", attemptsMade: 2, data: { x: 1 } }, new Error("boom"));
    await Promise.resolve();

    const dlqCalls = queueCalls.filter((call) => call.queueName === "dead-letter" && call.jobName === "dead-letter");
    expect(dlqCalls.length).toBeGreaterThan(0);
  });

  it("DLQ payload includes job metadata", async () => {
    await startWorkers();

    const issueWorker = workerInstances.find((worker) => worker.queueName === "issue-sla");
    issueWorker?.handlers.failed?.(
      { id: "job-2", name: "run-issue-sla-worker", attemptsMade: 1, data: { organizationId: "org_1" } },
      new Error("failed"),
    );
    await Promise.resolve();

    const dlqCall = queueCalls.find((call) => call.queueName === "dead-letter" && call.jobName === "dead-letter");
    expect(dlqCall).toBeTruthy();
    expect(dlqCall?.data).toEqual(
      expect.objectContaining({
        workerType: expect.any(String),
        failedJobId: "job-2",
        failedJobName: "run-issue-sla-worker",
        attemptsMade: 1,
        failureReason: "failed",
      }),
    );
  });

  it("worker retry attempts respect JOB_ATTEMPTS constant", async () => {
    await startWorkers();

    const repeatableJobCalls = queueCalls.filter(
      (call) => typeof call.options?.repeat === "object" && call.queueName !== "dead-letter",
    );

    expect(repeatableJobCalls.length).toBeGreaterThan(0);
    for (const call of repeatableJobCalls) {
      expect(call.options?.attempts).toBe(3);
    }
  });

  it("job timeout enforced", async () => {
    await startWorkers();

    const repeatableJobCalls = queueCalls.filter(
      (call) => typeof call.options?.repeat === "object" && call.queueName !== "dead-letter",
    );

    expect(repeatableJobCalls.length).toBeGreaterThan(0);
    for (const call of repeatableJobCalls) {
      expect(call.options?.timeout).toBe(120000);
    }
  });
});
