import { getObservabilityContext } from "@/lib/observability/context";
import { recordApiError, recordApiRequest } from "@/lib/observability/metrics";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  route?: string;
  latency?: number;
  [key: string]: unknown;
};

function write(level: LogLevel, message: string, fields?: LogFields) {
  const ctx = getObservabilityContext();
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId: fields?.requestId ?? ctx?.requestId ?? null,
    tenantId: fields?.tenantId ?? ctx?.tenantId ?? null,
    userId: fields?.userId ?? ctx?.userId ?? null,
    route: fields?.route ?? ctx?.route ?? null,
    latency: fields?.latency ?? null,
    ...fields,
  };

  const output = JSON.stringify(entry);
  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
}

export const logger = {
  debug(message: string, fields?: LogFields) {
    write("debug", message, fields);
  },
  info(message: string, fields?: LogFields) {
    write("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    write("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    write("error", message, fields);
  },
};

export function logApiRequestStart(route: string, method: string) {
  recordApiRequest(route);
  logger.info("api_request_started", { route, method });
}

export function logApiRequestEnd(route: string, method: string, status: number, latency: number) {
  if (status >= 400) {
    recordApiError(route);
  }

  logger.info("api_request_completed", {
    route,
    method,
    status,
    latency,
  });
}

export function logApiRequestError(route: string, method: string, latency: number, error: unknown) {
  recordApiError(route);

  logger.error("api_request_failed", {
    route,
    method,
    latency,
    error: error instanceof Error ? error.message : String(error),
  });
}
