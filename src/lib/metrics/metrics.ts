import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

export const registry = new Registry();

collectDefaultMetrics({
  register: registry,
});

export const civicHttpRequestsTotal = new Counter({
  name: "civic_http_requests_total",
  help: "Total number of HTTP requests handled by CivicMetrix",
  labelNames: ["method", "route", "status"] as const,
  registers: [registry],
});

export const civicHttpRequestDurationSeconds = new Histogram({
  name: "civic_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route"] as const,
  registers: [registry],
});

export const civicWorkerJobsTotal = new Counter({
  name: "civic_worker_jobs_total",
  help: "Total number of worker jobs processed",
  labelNames: ["worker", "status"] as const,
  registers: [registry],
});

export const civicWorkerJobsStartedTotal = new Counter({
  name: "civic_worker_jobs_started_total",
  help: "Total number of worker jobs started",
  labelNames: ["worker"] as const,
  registers: [registry],
});

export const civicDbQueryDurationSeconds = new Histogram({
  name: "civic_db_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["operation", "model"] as const,
  registers: [registry],
});
