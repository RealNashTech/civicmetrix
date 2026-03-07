import { Queue } from "bullmq";

const DEFAULT_ATTEMPTS = 3;

const redisUrl = process.env.REDIS_URL;
const connection =
  redisUrl != null
    ? (() => {
        const parsed = new URL(redisUrl);
        return {
          host: parsed.hostname,
          port: Number(parsed.port || 6379),
          username: parsed.username || undefined,
          password: parsed.password || undefined,
        };
      })()
    : null;

export const eventProcessingQueue = connection
  ? new Queue("event-processing", {
      connection,
      defaultJobOptions: {
        attempts: DEFAULT_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: 1_000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  : null;
export const grantRemindersQueue = connection
  ? new Queue("grant-reminders", {
      connection,
      defaultJobOptions: {
        attempts: DEFAULT_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: 1_000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  : null;
export const issueSlaQueue = connection
  ? new Queue("issue-sla", {
      connection,
      defaultJobOptions: {
        attempts: DEFAULT_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: 1_000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  : null;
export const maintenanceSchedulerQueue = connection
  ? new Queue("maintenance-scheduler", {
      connection,
      defaultJobOptions: {
        attempts: DEFAULT_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: 1_000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  : null;
export const civicIntelligenceQueue = connection
  ? new Queue("civic-intelligence", {
      connection,
      defaultJobOptions: {
        attempts: DEFAULT_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: 1_000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    })
  : null;
export const deadLetterQueue = connection
  ? new Queue("dead-letter", {
      connection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    })
  : null;
