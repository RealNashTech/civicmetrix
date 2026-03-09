# Security Rate Limits

## Overview
CivicMetrix defines centralized rate-limit policy tiers for consistent endpoint risk controls.

Configuration and wrappers are scaffolded in:
- `src/lib/security/rateLimits.ts`
- `src/lib/security/rateLimitMiddleware.ts`
- `src/lib/security/withRateLimit.ts`

## Policy Tiers
Current policy tiers:
- `PUBLIC_READ`: 120 requests / 60s
- `PUBLIC_EXPORT`: 30 requests / 60s
- `AUTHENTICATED_USER`: 300 requests / 60s
- `ADMIN_ACTION`: 60 requests / 60s
- `INTERNAL_SYSTEM`: 1000 requests / 60s

Each tier defines:
- `windowMs`
- `maxRequests`

## Public vs Authenticated Limits
Public endpoints should map to stricter tiers (`PUBLIC_READ`, `PUBLIC_EXPORT`) due to abuse and scraping risk.
Authenticated endpoints can use higher throughput tiers (`AUTHENTICATED_USER`) with targeted controls for write-heavy and privileged actions (`ADMIN_ACTION`).
Internal endpoints and machine-to-machine traffic can use `INTERNAL_SYSTEM` where appropriate.

## Middleware Behavior
Rate-limit key format:
- `ratelimit:<tier>:<ip>`

Flow:
1. Resolve client IP from `x-forwarded-for` or `x-real-ip`.
2. Increment Redis counter for tier + IP.
3. Apply threshold check and return HTTP `429` on violations.
4. Return standard rate-limit headers (`X-RateLimit-*`, `Retry-After`).

## Future Endpoint Mapping Plan
Recommended rollout:
1. Map `/api/public/*` read routes to `PUBLIC_READ`.
2. Map export routes (`*.csv`, bulk JSON exports) to `PUBLIC_EXPORT`.
3. Map authenticated user APIs to `AUTHENTICATED_USER`.
4. Map admin-only writes and destructive actions to `ADMIN_ACTION`.
5. Map internal health/metrics/system APIs to `INTERNAL_SYSTEM`.

This staged mapping should be introduced route-by-route to avoid behavior regressions.
