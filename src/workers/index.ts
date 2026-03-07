import { randomUUID } from "crypto";
import { Job, Queue, Worker } from "bullmq";

import { runWithObservabilityContext } from "@/lib/observability/context";
import { logger } from "@/lib/observability/logger";
import { installProcessErrorHandlers } from "@/lib/observability/process-errors";
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

const JOB_ATTEMPTS = 3;
const DLQ_ALERT_THRESHOLD = 25;

async function pushToDeadLetterQueue(deadLetterQueue: Queue, workerType: string, job: Job | undefined, error: Error) {
  await deadLetterQueue.add(
    "dead-letter",
    {
      workerType,
      failedJobId: job?.id ?? null,
      failedJobName: job?.name ?? null,
      attemptsMade: job?.attemptsMade ?? 0,
      payload: job?.data ?? null,
      failureReason: error.message,
      failedAt: new Date().toISOString(),
    },
    {
      jobId: `dlq:${workerType}:${job?.id ?? randomUUID()}:${Date.now()}`,
      removeOnComplete: 500,
      removeOnFail: 500,
    },
  );
}

async function runInstrumentedJob(
  workerType: string,
  job: Job,
  handler: () => Promise<void>,
) {
  const startedAt = Date.now();
  const requestId = `worker-${job.id ?? randomUUID()}`;

  return runWithObservabilityContext(
    {
      requestId,
      route: `worker:${workerType}`,
      workerType,
      jobId: String(job.id ?? ""),
    },
    async () => {
      logger.info("worker_job_started", {
        workerType,
        jobId: job.id ?? null,
        jobName: job.name,
        retryCount: job.attemptsMade,
      });

      try {
        await handler();
        logger.info("worker_job_completed", {
          workerType,
          jobId: job.id ?? null,
          jobName: job.name,
          runtime: Date.now() - startedAt,
          retryCount: job.attemptsMade,
        });
      } catch (error) {
        logger.error("worker_job_failed", {
          workerType,
          jobId: job.id ?? null,
          jobName: job.name,
          runtime: Date.now() - startedAt,
          retryCount: job.attemptsMade,
          failureReason: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  );
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
  deadLetterQueue: Queue,
) {
  await deadLetterQueue.add(
    "run-dead-letter-metrics",
    {},
    {
      jobId: "repeat:dead-letter-health:5m",
      repeat: { every: 5 * 60 * 1000 },
      removeOnComplete: 10,
      removeOnFail: 10,
    },
  );

  await eventQueue.add(
    "run-event-worker",
    {},
    {
      jobId: "repeat:event-worker:10s",
      repeat: { every: 10_000 },
      attempts: JOB_ATTEMPTS,
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
      attempts: JOB_ATTEMPTS,
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
      attempts: JOB_ATTEMPTS,
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
      attempts: JOB_ATTEMPTS,
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
      attempts: JOB_ATTEMPTS,
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
      attempts: JOB_ATTEMPTS,
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
      attempts: JOB_ATTEMPTS,
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
      attempts: JOB_ATTEMPTS,
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
      attempts: JOB_ATTEMPTS,
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
      attempts: JOB_ATTEMPTS,
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
  installProcessErrorHandlers();
  const connection = getRedisConnection();

  const eventQueue = new Queue("event-processing", { connection });
  const grantReminderQueue = new Queue("grant-reminders", { connection });
  const issueSlaQueue = new Queue("issue-sla", { connection });
  const maintenanceQueue = new Queue("maintenance-scheduler", { connection });
  const civicIntelligenceQueue = new Queue("civic-intelligence", { connection });
  const deadLetterQueue = new Queue("dead-letter", { connection });

  await scheduleRepeatableJobs(
    eventQueue,
    grantReminderQueue,
    issueSlaQueue,
    maintenanceQueue,
    civicIntelligenceQueue,
    deadLetterQueue,
  );

  const workerOptions = {
    connection,
    concurrency: 1,
    maxStalledCount: 1,
    stalledInterval: 30_000,
  } as const;

  const eventWorker = new Worker(
    "event-processing",
    async (job) => {
      await runInstrumentedJob("event-processing", job, async () => {
        await runEventWorker();
      });
    },
    workerOptions,
  );

  const grantReminderWorker = new Worker(
    "grant-reminders",
    async (job) => {
      await runInstrumentedJob("grant-reminders", job, async () => {
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

        logger.error("worker_unknown_job", {
          workerType: "grant-reminders",
          jobName: job.name,
        });
      });
    },
    workerOptions,
  );

  const issueSlaWorker = new Worker(
    "issue-sla",
    async (job) => {
      await runInstrumentedJob("issue-sla", job, async () => {
        await runIssueSlaWorker();
      });
    },
    workerOptions,
  );

  const maintenanceWorker = new Worker(
    "maintenance-scheduler",
    async (job) => {
      await runInstrumentedJob("maintenance-scheduler", job, async () => {
        await runMaintenanceSchedulerWorker();
      });
    },
    workerOptions,
  );

  const civicIntelligenceWorker = new Worker(
    "civic-intelligence",
    async (job) => {
      await runInstrumentedJob("civic-intelligence", job, async () => {
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

        logger.error("worker_unknown_job", {
          workerType: "civic-intelligence",
          jobName: job.name,
        });
      });
    },
    workerOptions,
  );

  const deadLetterWorker = new Worker(
    "dead-letter",
    async (job) => {
      await runInstrumentedJob("dead-letter", job, async () => {
        if (job.name === "dead-letter") {
          logger.error("worker_dead_letter_received", {
            workerType: job.data?.workerType ?? null,
            failedJobId: job.data?.failedJobId ?? null,
            failedJobName: job.data?.failedJobName ?? null,
            failureReason: job.data?.failureReason ?? null,
            attemptsMade: job.data?.attemptsMade ?? null,
          });
          return;
        }

        if (job.name === "run-dead-letter-metrics") {
          const counts = await deadLetterQueue.getJobCounts("waiting", "active", "failed");
          const waiting = counts.waiting ?? 0;
          const failed = counts.failed ?? 0;
          if (waiting > DLQ_ALERT_THRESHOLD || failed > 0) {
            logger.error("worker_dead_letter_threshold_exceeded", {
              waiting,
              failed,
              threshold: DLQ_ALERT_THRESHOLD,
            });
          } else {
            logger.info("worker_dead_letter_healthy", {
              waiting,
              failed,
            });
          }
          return;
        }

        logger.error("worker_unknown_job", {
          workerType: "dead-letter",
          jobName: job.name,
        });
      });
    },
    workerOptions,
  );

  eventWorker.on("error", (error) => {
    logger.error("worker_error", {
      workerType: "event-processing",
      failureReason: error.message,
    });
  });
  eventWorker.on("failed", (job, error) => {
    logger.error("worker_failed", {
      workerType: "event-processing",
      jobName: job?.name ?? null,
      jobId: job?.id ?? null,
      retryCount: job?.attemptsMade ?? 0,
      failureReason: error.message,
    });
    void pushToDeadLetterQueue(deadLetterQueue, "event-processing", job, error);
  });

  grantReminderWorker.on("error", (error) => {
    logger.error("worker_error", {
      workerType: "grant-reminders",
      failureReason: error.message,
    });
  });
  grantReminderWorker.on("failed", (job, error) => {
    logger.error("worker_failed", {
      workerType: "grant-reminders",
      jobName: job?.name ?? null,
      jobId: job?.id ?? null,
      retryCount: job?.attemptsMade ?? 0,
      failureReason: error.message,
    });
    void pushToDeadLetterQueue(deadLetterQueue, "grant-reminders", job, error);
  });

  issueSlaWorker.on("error", (error) => {
    logger.error("worker_error", {
      workerType: "issue-sla",
      failureReason: error.message,
    });
  });
  issueSlaWorker.on("failed", (job, error) => {
    logger.error("worker_failed", {
      workerType: "issue-sla",
      jobName: job?.name ?? null,
      jobId: job?.id ?? null,
      retryCount: job?.attemptsMade ?? 0,
      failureReason: error.message,
    });
    void pushToDeadLetterQueue(deadLetterQueue, "issue-sla", job, error);
  });

  maintenanceWorker.on("error", (error) => {
    logger.error("worker_error", {
      workerType: "maintenance-scheduler",
      failureReason: error.message,
    });
  });
  maintenanceWorker.on("failed", (job, error) => {
    logger.error("worker_failed", {
      workerType: "maintenance-scheduler",
      jobName: job?.name ?? null,
      jobId: job?.id ?? null,
      retryCount: job?.attemptsMade ?? 0,
      failureReason: error.message,
    });
    void pushToDeadLetterQueue(deadLetterQueue, "maintenance-scheduler", job, error);
  });

  civicIntelligenceWorker.on("error", (error) => {
    logger.error("worker_error", {
      workerType: "civic-intelligence",
      failureReason: error.message,
    });
  });
  civicIntelligenceWorker.on("failed", (job, error) => {
    logger.error("worker_failed", {
      workerType: "civic-intelligence",
      jobName: job?.name ?? null,
      jobId: job?.id ?? null,
      retryCount: job?.attemptsMade ?? 0,
      failureReason: error.message,
    });
    void pushToDeadLetterQueue(deadLetterQueue, "civic-intelligence", job, error);
  });

  deadLetterWorker.on("error", (error) => {
    logger.error("worker_error", {
      workerType: "dead-letter",
      failureReason: error.message,
    });
  });
  deadLetterWorker.on("failed", (job, error) => {
    logger.error("worker_failed", {
      workerType: "dead-letter",
      jobName: job?.name ?? null,
      jobId: job?.id ?? null,
      retryCount: job?.attemptsMade ?? 0,
      failureReason: error.message,
    });
  });

  logger.info("worker_started", { workerType: "event-processing" });
  logger.info("worker_started", { workerType: "grant-reminders" });
  logger.info("worker_started", { workerType: "issue-sla" });
  logger.info("worker_started", { workerType: "maintenance-scheduler" });
  logger.info("worker_started", { workerType: "civic-intelligence" });
  logger.info("worker_started", { workerType: "dead-letter" });
}

export async function startWorkers() {
  logger.info("worker_system_starting");
  await bootstrapWorkers();
}
