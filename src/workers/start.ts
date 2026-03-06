import { logger } from "@/lib/observability/logger"
import { installProcessErrorHandlers } from "@/lib/observability/process-errors"
import { startWorkers } from "./index"

async function bootstrap() {
  installProcessErrorHandlers()
  logger.info("workers_bootstrap")
  await startWorkers()
}

bootstrap()
