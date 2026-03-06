import { logger } from "@/lib/observability/logger";

let installed = false;

export function installProcessErrorHandlers() {
  if (installed || typeof process === "undefined") {
    return;
  }

  process.on("uncaughtException", (error) => {
    logger.error("uncaught_exception", {
      error: error.message,
      stack: error.stack,
    });
  });

  process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error("unhandled_rejection", {
      error: error.message,
      stack: error.stack,
    });
  });

  installed = true;
}
