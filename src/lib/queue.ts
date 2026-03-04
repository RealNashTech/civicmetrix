import { Queue } from "bullmq";

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
  ? new Queue("event-processing", { connection })
  : null;
export const grantRemindersQueue = connection
  ? new Queue("grant-reminders", { connection })
  : null;
export const issueSlaQueue = connection ? new Queue("issue-sla", { connection }) : null;
export const maintenanceSchedulerQueue = connection
  ? new Queue("maintenance-scheduler", { connection })
  : null;
export const civicIntelligenceQueue = connection
  ? new Queue("civic-intelligence", { connection })
  : null;
