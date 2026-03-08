# Worker System Audit

## Scope
- BullMQ queue topology, retry/DLQ behavior, idempotency, scalability patterns.

## Findings

### 1) Dead-letter queue has producers but no consumer worker
- Risk Level: **High**
- Impact: failed job records accumulate without processing/alerting automation.
- Evidence: jobs pushed via `pushToDeadLetterQueue` (`src/workers/index.ts:20-38, 406-483`); no `new Worker("dead-letter", ...)` exists.
- Recommended Fix: add DLQ consumer/monitor worker and retention policy with alerting.
- Estimated Effort: **Medium**

### 2) Scheduled dead-letter health job is enqueued but never processed
- Risk Level: **Medium**
- Impact: false sense of DLQ health monitoring.
- Evidence: `run-dead-letter-metrics` repeat job is added (`src/workers/index.ts:110-119`), but no handler.
- Recommended Fix: implement corresponding worker handler or remove the schedule.
- Estimated Effort: **Low**

### 3) Worker timeout expectation and implementation are mismatched
- Risk Level: **Medium**
- Impact: tests fail; long-running jobs can hang without enforced timeout.
- Evidence: unit test expects `options.timeout=120000` (`tests/unit/worker-dlq.test.ts:139-149`), but scheduled jobs omit timeout (`src/workers/index.ts:121-210`).
- Recommended Fix: define explicit timeout in repeat job options and align tests.
- Estimated Effort: **Low**

### 4) Worker scans and per-record loops can become expensive
- Risk Level: **Medium**
- Impact: increased DB load and worker lag at scale.
- Evidence: `findMany` + JS filtering/reduce patterns across reminder/SLA/maintenance/intelligence workers.
- Recommended Fix: move more filtering/aggregation to SQL and paginate by indexed cursors.
- Estimated Effort: **Medium**

### 5) Positive controls: retries + backoff + stable repeat job IDs
- Risk Level: **Low**
- Impact: good baseline reliability and duplicate scheduling protection.
- Evidence: `attempts=3`, exponential backoff, fixed `jobId` per schedule.
- Recommended Fix: keep, add queue-level SLO metrics.
- Estimated Effort: **Low**
