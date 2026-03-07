const apiRequestCounts = new Map<string, number>();
const apiErrorCounts = new Map<string, number>();
const workerFailureCounts = new Map<string, number>();

let dbQueryCount = 0;
let dbQueryTotalMs = 0;
let dbSlowQueryCount = 0;
let dlqAlertCount = 0;

function incrementInMap(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function recordApiRequest(route: string) {
  incrementInMap(apiRequestCounts, route);
}

export function recordApiError(route: string) {
  incrementInMap(apiErrorCounts, route);
}

export function recordDbQuery(durationMs: number, isSlow: boolean) {
  dbQueryCount += 1;
  dbQueryTotalMs += durationMs;
  if (isSlow) {
    dbSlowQueryCount += 1;
  }
}

export function recordWorkerFailure(workerType: string) {
  incrementInMap(workerFailureCounts, workerType);
}

export function recordDlqAlert() {
  dlqAlertCount += 1;
}

export function getMetricsSnapshot() {
  return {
    apiRequestCounts: Object.fromEntries(apiRequestCounts),
    apiErrorCounts: Object.fromEntries(apiErrorCounts),
    db: {
      queryCount: dbQueryCount,
      averageLatencyMs: dbQueryCount > 0 ? Math.round((dbQueryTotalMs / dbQueryCount) * 100) / 100 : 0,
      slowQueryCount: dbSlowQueryCount,
    },
    workers: {
      failureCounts: Object.fromEntries(workerFailureCounts),
      dlqAlertCount,
    },
  };
}
