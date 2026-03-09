# Database Access Standard

## Purpose
CivicMetrix now has a standardized database access layer to separate:
- system-level database operations
- tenant-safe application operations

This standard is intended to enforce predictable data access patterns and reduce tenant-isolation drift.

## System Database Access
Use:
- `getSystemDb()` from `src/lib/db/systemClient.ts`

Behavior:
- returns the shared Prisma client instance from `src/lib/prisma.ts`
- intended for infrastructure and cross-tenant/system workflows

Typical use cases:
- workers that enumerate organizations
- internal platform services
- bootstrapping and maintenance scripts

## Tenant-Safe Database Access
Use:
- `getTenantDb(organizationId, fn)` from `src/lib/db/tenantClient.ts`

Behavior:
1. opens a Prisma transaction
2. sets tenant context with `SET LOCAL app.current_tenant = '<organizationId>'`
3. executes all callback queries on the transaction client

Typical use cases:
- dashboard/server actions operating on one tenant
- tenant-scoped API handlers
- tenant-scoped worker steps

## When To Use Each
Use `getSystemDb()` when:
- the operation is intentionally system-level
- tenant context is not available or not applicable
- a workflow must access multiple tenants deliberately

Use `getTenantDb()` when:
- an operation belongs to one organization
- tenant isolation must be enforced for all queries in the unit of work

## Prohibited Pattern: Direct Prisma Usage
Direct Prisma usage (`prisma.<model>...` outside the standardized layer) is prohibited for application code because it:
- bypasses the controlled entry points
- increases risk of missing tenant context
- creates inconsistent access behavior across routes, workers, and services

Exception scope (narrow):
- low-level database layer implementation itself
- schema/migration tooling and seed scripts where explicitly system-level

## Enforcement
All application code must use:
- `getTenantDb()`
- `getSystemDb()`

Direct Prisma usage and legacy access helpers are blocked by lint:
- `new PrismaClient()`
- `import prisma from "@/lib/prisma"`
- direct `prisma.*`
- `db()`
- `dbSystem()`
- `tenantDb()`

Violations fail lint checks with:
- `Direct Prisma access is prohibited. Use getTenantDb() or getSystemDb().`
