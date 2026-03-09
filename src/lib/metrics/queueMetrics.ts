import { Gauge, Histogram } from "prom-client";
import { Queue, QueueEvents } from "bullmq";

import { civicWorkerJobsTotal, registry } from "@/lib/metrics";

export const civicWorkerJobDurationSeconds = new Histogram({
  name: "civic_worker_job_duration_seconds",
  help: "Worker job runtime duration in seconds",
  labelNames: ["worker"] as const,
  registers: [registry],
});

export const civicWorkerQueueBacklog = new Gauge({
  name: "civic_worker_queue_backlog",
  help: "Current queue backlog (waiting jobs)",
  labelNames: ["queue"] as const,
  registers: [registry],
});

type QueueMetricsHandle = {
  events: QueueEvents;
  timer: NodeJS.Timeout;
};

const queueMetricsHandles = new Map<string, QueueMetricsHandle>();

async function recordDuration(queue: Queue, workerName: string, jobId?: string) {
  if (!jobId) {
    return;
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    return;
  }

  const { processedOn, finishedOn } = job;
  if (typeof processedOn !== "number" || typeof finishedOn !== "number") {
    return;
  }

  const durationSeconds = Math.max(0, (finishedOn - processedOn) / 1000);
  civicWorkerJobDurationSeconds.observe({ worker: workerName }, durationSeconds);
}

async function setBacklog(queue: Queue, queueName: string) {
  const waiting = await queue.getWaitingCount();
  civicWorkerQueueBacklog.set({ queue: queueName }, waiting);
}

export function instrumentQueueMetrics(queueName: string, queue: Queue) {
  if (queueMetricsHandles.has(queueName)) {
    return queueMetricsHandles.get(queueName)!;
  }

  const events = new QueueEvents(queueName, {
    connection: queue.opts.connection,
  });

  events.on("completed", async ({ jobId }) => {
    civicWorkerJobsTotal.inc({ worker: queueName, status: "completed" });
    try {
      await recordDuration(queue, queueName, jobId);
    } catch {
      // Best-effort duration collection only.
    }
  });

  events.on("failed", async ({ jobId }) => {
    civicWorkerJobsTotal.inc({ worker: queueName, status: "failed" });
    try {
      await recordDuration(queue, queueName, jobId);
    } catch {
      // Best-effort duration collection only.
    }
  });

  const timer = setInterval(() => {
    void setBacklog(queue, queueName).catch(() => {
      // Best-effort backlog collection only.
    });
  }, 15_000);

  timer.unref();
  void setBacklog(queue, queueName).catch(() => {
    // Best-effort initial backlog collection only.
  });

  const handle = { events, timer };
  queueMetricsHandles.set(queueName, handle);
  return handle;
}
