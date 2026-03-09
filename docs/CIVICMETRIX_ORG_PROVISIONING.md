# CivicMetrix Organization Provisioning

## Purpose
The organization provisioning engine initializes a new tenant baseline when a city or government registers.

Service path:
- `src/services/organization-provisioning.ts`

API integration point:
- `src/app/api/auth/register/route.ts`

## Entry Point
```ts
export async function provisionOrganization(
  organizationId: string,
  adminUserId: string
)
```

This function is called after organization and admin user creation in registration.

## Provisioning Lifecycle
1. Emit `ORG_PROVISION_STARTED` event.
2. Seed default RBAC roles for the tenant.
3. Ensure admin user is assigned `SYSTEM_ADMIN`.
4. Ensure default departments exist:
   - Public Works
   - Housing
   - Community Development
   - Parks & Recreation
   - Administration
5. Ensure baseline dashboard exists:
   - `City Operations Baseline Dashboard`
6. Ensure baseline KPI records exist and are related to departments/dashboard:
   - Average Service Response Time
   - Infrastructure Condition Index
   - Open Civic Issues
   - Grant Utilization Rate
   - Citizen Satisfaction
7. Emit `ORG_PROVISION_COMPLETED` event.
8. On any failure, emit `ORG_PROVISION_FAILED` with error payload and rethrow.

## Multi-Tenant Safety
All provisioning writes run inside:
- `tenantDb(organizationId, ...)`

This guarantees tenant-scoped write execution and aligns with the existing RLS/tenant context model.

## Idempotency
Provisioning is designed to be safely re-runnable:
- Roles: `createMany(..., skipDuplicates: true)`
- Departments: create only when missing
- Dashboard baseline: create only when missing
- KPIs: create when missing; on rerun, only backfill missing relations (`dashboardId`, `departmentId`)
- Admin role assignment: `updateMany` scoped by `organizationId` and `adminUserId`

Because of this, retries and manual reruns are safe and do not duplicate baseline records.

## Event Types
Provisioning emits these event types in `Event`:
- `ORG_PROVISION_STARTED`
- `ORG_PROVISION_COMPLETED`
- `ORG_PROVISION_FAILED`

All events are tenant-scoped and include `adminUserId` in payload.
