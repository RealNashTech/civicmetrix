import { Queue, Worker } from "bullmq";

import { runEventWorker } from "@/workers/event-worker";
import { runGrantDeadlineWorker } from "@/workers/grant-deadline-worker";
import { runGrantPipelineRefreshWorker } from "@/workers/grant-pipeline-refresh-worker";
import { runGrantReminderWorker } from "@/workers/grant-reminder-worker";
import { runGrantRiskWorker } from "@/workers/intelligence/grant-risk-worker";
import { runIssueAnomalyWorker } from "@/workers/intelligence/issue-anomaly-worker";
import { runKpiTrendWorker } from "@/workers/intelligence/kpi-trend-worker";
import { runSpatialClusterWorker } from "@/workers/intelligence/spatial-cluster-worker";
import { runIssueSlaWorker } from "@/workers/issue-sla-worker";
import { runMaintenanceSchedulerWorker } from "@/workers/maintenance-scheduler-worker";

type LogLevel = "info" | "error";

function log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
    return;
  }
  console.log(output);
}

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is required to run workers.");
  }

  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
  };
}

async function scheduleRepeatableJobs(
  eventQueue: Queue,
  grantQueue: Queue,
  issueSlaQueue: Queue,
  maintenanceQueue: Queue,
  civicIntelligenceQueue: Queue,
) {
  await eventQueue.add(
    "run-event-worker",
    {},
    {
      jobId: "repeat:event-worker:10s",
      repeat: { every: 10_000 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );

  await grantQueue.add(
    "run-grant-reminder-worker",
    {},
    {
      jobId: "repeat:grant-reminder-worker:15m",
      repeat: { every: 15 * 60 * 1000 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );

  await grantQueue.add(
    "run-grant-deadline-worker",
    {},
    {
      jobId: "repeat:grant-deadline-worker:24h",
      repeat: { every: 24 * 60 * 60 * 1000 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );

  await grantQueue.add(
    "run-grant-pipeline-refresh-worker",
    {},
    {
      jobId: "repeat:grant-pipeline-refresh-worker:5m",
      repeat: { every: 5 * 60 * 1000 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );

  await issueSlaQueue.add(
    "run-issue-sla-worker",
    {},
    {
      jobId: "repeat:issue-sla-worker:5m",
      repeat: { every: 5 * 60 * 1000 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );

  await maintenanceQueue.add(
    "run-maintenance-scheduler-worker",
    {},
    {
      jobId: "repeat:maintenance-scheduler-worker:1h",
      repeat: { every: 60 * 60 * 1000 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );

  await civicIntelligenceQueue.add(
    "run-issue-anomaly-worker",
    {},
    {
      jobId: "repeat:issue-anomaly-worker:30m",
      repeat: { every: 30 * 60 * 1000 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );

  await civicIntelligenceQueue.add(
    "run-grant-risk-worker",
    {},
    {
      jobId: "repeat:grant-risk-worker:60m",
      repeat: { every: 60 * 60 * 1000 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );

  await civicIntelligenceQueue.add(
    "run-kpi-trend-worker",
    {},
    {
      jobId: "repeat:kpi-trend-worker:60m",
      repeat: { every: 60 * 60 * 1000 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );

  await civicIntelligenceQueue.add(
    "run-spatial-cluster-worker",
    {},
    {
      jobId: "repeat:spatial-cluster-worker:30m",
      repeat: { every: 30 * 60 * 1000 },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );
}

async function bootstrapWorkers() {
  const connection = getRedisConnection();

  const eventQueue = new Queue("event-processing", { connection });
  const grantReminderQueue = new Queue("grant-reminders", { connection });
  const issueSlaQueue = new Queue("issue-sla", { connection });
  const maintenanceQueue = new Queue("maintenance-scheduler", { connection });
  const civicIntelligenceQueue = new Queue("civic-intelligence", { connection });

  await scheduleRepeatableJobs(
    eventQueue,
    grantReminderQueue,
    issueSlaQueue,
    maintenanceQueue,
    civicIntelligenceQueue,
  );

  const eventWorker = new Worker(
    "event-processing",
    async (job) => {
      log("info", `Worker executed job: ${job.name}`, { worker: "event-processing" });
      await runEventWorker();
    },
    { connection, concurrency: 1 },
  );

  const grantReminderWorker = new Worker(
    "grant-reminders",
    async (job) => {
      log("info", `Worker executed job: ${job.name}`, { worker: "grant-reminders" });
      if (job.name === "run-grant-reminder-worker") {
        await runGrantReminderWorker();
        return;
      }

      if (job.name === "run-grant-deadline-worker") {
        await runGrantDeadlineWorker();
        return;
      }

      if (job.name === "run-grant-pipeline-refresh-worker") {
        await runGrantPipelineRefreshWorker();
        return;
      }

      log("error", "Unknown grant-reminders job", {
        worker: "grant-reminders",
        jobName: job.name,
      });
    },
    { connection, concurrency: 1 },
  );

  const issueSlaWorker = new Worker(
    "issue-sla",
    async (job) => {
      log("info", `Worker executed job: ${job.name}`, { worker: "issue-sla" });
      await runIssueSlaWorker();
    },
    { connection, concurrency: 1 },
  );

  const maintenanceWorker = new Worker(
    "maintenance-scheduler",
    async (job) => {
      log("info", `Worker executed job: ${job.name}`, { worker: "maintenance-scheduler" });
      await runMaintenanceSchedulerWorker();
    },
    { connection, concurrency: 1 },
  );

  const civicIntelligenceWorker = new Worker(
    "civic-intelligence",
    async (job) => {
      log("info", `Worker executed job: ${job.name}`, { worker: "civic-intelligence" });
      if (job.name === "run-issue-anomaly-worker") {
        await runIssueAnomalyWorker();
        return;
      }

      if (job.name === "run-grant-risk-worker") {
        await runGrantRiskWorker();
        return;
      }

      if (job.name === "run-kpi-trend-worker") {
        await runKpiTrendWorker();
        return;
      }

      if (job.name === "run-spatial-cluster-worker") {
        await runSpatialClusterWorker();
        return;
      }

      log("error", "Unknown civic-intelligence job", {
        worker: "civic-intelligence",
        jobName: job.name,
      });
    },
    { connection, concurrency: 1 },
  );

  eventWorker.on("error", (error) => {
    log("error", "Worker error: event-processing", {
      worker: "event-processing",
      error: error.message,
    });
  });
  eventWorker.on("failed", (job, error) => {
    log("error", "Worker failed job: event-processing", {
      worker: "event-processing",
      jobName: job?.name ?? null,
      error: error.message,
    });
  });

  grantReminderWorker.on("error", (error) => {
    log("error", "Worker error: grant-reminders", {
      worker: "grant-reminders",
      error: error.message,
    });
  });
  grantReminderWorker.on("failed", (job, error) => {
    log("error", "Worker failed job: grant-reminders", {
      worker: "grant-reminders",
      jobName: job?.name ?? null,
      error: error.message,
    });
  });

  issueSlaWorker.on("error", (error) => {
    log("error", "Worker error: issue-sla", {
      worker: "issue-sla",
      error: error.message,
    });
  });
  issueSlaWorker.on("failed", (job, error) => {
    log("error", "Worker failed job: issue-sla", {
      worker: "issue-sla",
      jobName: job?.name ?? null,
      error: error.message,
    });
  });

  maintenanceWorker.on("error", (error) => {
    log("error", "Worker error: maintenance-scheduler", {
      worker: "maintenance-scheduler",
      error: error.message,
    });
  });
  maintenanceWorker.on("failed", (job, error) => {
    log("error", "Worker failed job: maintenance-scheduler", {
      worker: "maintenance-scheduler",
      jobName: job?.name ?? null,
      error: error.message,
    });
  });

  civicIntelligenceWorker.on("error", (error) => {
    log("error", "Worker error: civic-intelligence", {
      worker: "civic-intelligence",
      error: error.message,
    });
  });
  civicIntelligenceWorker.on("failed", (job, error) => {
    log("error", "Worker failed job: civic-intelligence", {
      worker: "civic-intelligence",
      jobName: job?.name ?? null,
      error: error.message,
    });
  });

  log("info", "Worker started: event-processing", { worker: "event-processing" });
  log("info", "Worker started: grant-reminders", { worker: "grant-reminders" });
  log("info", "Worker started: issue-sla", { worker: "issue-sla" });
  log("info", "Worker started: maintenance-scheduler", { worker: "maintenance-scheduler" });
  log("info", "Worker started: civic-intelligence", { worker: "civic-intelligence" });
}

export async function startWorkers() {
  console.log("[workers] starting worker system");
  await bootstrapWorkers();
}
