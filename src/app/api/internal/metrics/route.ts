import { NextResponse } from "next/server";

import {
  deadLetterQueue,
  civicIntelligenceQueue,
  eventProcessingQueue,
  grantRemindersQueue,
  issueSlaQueue,
  maintenanceSchedulerQueue,
} from "@/lib/queue";
import { withApiObservability } from "@/lib/observability/http";
import { getMetricsSnapshot } from "@/lib/observability/metrics";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { AuthorizationError } from "@/lib/policies/base";
import { authorizeStaffOrApiScope } from "@/lib/security/authorization";

async function getQueueSizes() {
  const queues = [
    ["event-processing", eventProcessingQueue],
    ["grant-reminders", grantRemindersQueue],
    ["issue-sla", issueSlaQueue],
    ["maintenance-scheduler", maintenanceSchedulerQueue],
    ["civic-intelligence", civicIntelligenceQueue],
    ["dead-letter", deadLetterQueue],
  ] as const;

  const entries = await Promise.all(
    queues.map(async ([name, queue]) => {
      if (!queue) {
        return [name, null] as const;
      }

      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
      );

      return [name, counts] as const;
    }),
  );

  return Object.fromEntries(entries);
}

async function getMetrics(request: Request) {
  await enforceRateLimit("internal metrics", request);
  await authorizeStaffOrApiScope(request, "system:metrics:read", "ADMIN");

  const [queueSizes, snapshot] = await Promise.all([
    getQueueSizes(),
    Promise.resolve(getMetricsSnapshot()),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    workerQueueSizes: queueSizes,
    dbQueryLatency: snapshot.db,
    apiRequestCounts: snapshot.apiRequestCounts,
    errorCounts: snapshot.apiErrorCounts,
  });
}

export const GET = withApiObservability("/api/internal/metrics", "GET", async (request) => {
  try {
    return await getMetrics(request);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
});
