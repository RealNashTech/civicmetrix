# Observability Architecture

## Metrics Endpoint
CivicMetrix exposes Prometheus metrics at:
- `GET /api/metrics`

The endpoint returns Prometheus-formatted metrics from the shared registry.

## Prometheus Integration
Metrics are defined in:
- `src/lib/metrics/metrics.ts`

Current metric set:
- `civic_http_requests_total` (Counter)
- `civic_http_request_duration_seconds` (Histogram)
- `civic_worker_jobs_total` (Counter)
- `civic_db_query_duration_seconds` (Histogram)

Default Node.js/process metrics are also collected via `collectDefaultMetrics()`.

## Request Instrumentation Scaffolding
Request instrumentation helper:
- `src/lib/metrics/requestMetrics.ts`

This helper records:
- request count (`method`, `route`, `status`)
- request latency (`method`, `route`)

It is intentionally scaffolding-only and can be applied to handlers incrementally.

## Future Grafana Dashboards
Recommended next dashboards:
- API throughput and error rates by route
- API latency percentiles by route
- worker success/failure rates by worker name
- database query latency by operation/model

## Worker Instrumentation Plan
Planned incremental rollout:
1. Wrap worker execution boundaries to increment `civic_worker_jobs_total` with `worker` and `status` labels.
2. Record worker runtime duration in a new histogram (optional extension).
3. Add queue depth/lag metrics for scheduling and backlog visibility.
4. Wire alerts from Prometheus rules into operational channels.

## Worker Observability
Queue and worker observability is instrumented through BullMQ `QueueEvents` listeners and Prometheus metrics.

Current worker/queue metrics:
- `civic_worker_jobs_total` with labels `worker`, `status` (`completed`, `failed`)
- `civic_worker_job_duration_seconds` with label `worker`
- `civic_worker_queue_backlog` with label `queue`

Monitoring coverage:
- Queue backlog monitoring via periodic `getWaitingCount()` polling
- Job failure rate tracking from `failed` events
- Worker latency tracking from per-job runtime observation

Future SLO dashboards:
- Per-worker success rate and failure budget burn
- P95/P99 worker job duration by queue
- Queue backlog trend and saturation alerts
- Dependency-linked incident views (queue lag vs API latency vs DB latency)
