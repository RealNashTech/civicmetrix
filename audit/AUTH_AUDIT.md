# Authentication and Authorization Audit

## Scope
- NextAuth config, middleware, route/page guards, server actions, API token scope checks.

## Observed Design
- Credentials-only auth for staff and citizen (`src/lib/auth.ts`).
- JWT carries `role`, `organizationId`, `organizationSlug`, `userType`, `citizenId`.
- Staff authz helper: `requireStaffUser(minRole)`.
- API token helper: `requireApiScope(request, scope)`.

## Findings

### 1) Citizen/staff tenant context split causes auth-context inconsistency
- Risk Level: **Critical**
- Impact: authenticated citizen requests can pass auth checks but fail DB access when `db()` requires tenant context.
- Evidence: `src/lib/auth.ts:233-245` excludes citizens from `setTenantContext`; middleware does not run on `/citizen/*` (`middleware.ts:42`); citizen pages call `db()` (`src/app/citizen/dashboard/page.tsx:13`).
- Recommended Fix: set tenant context for citizens in `auth()` and/or extend middleware matcher to `/citizen/:path*`.
- Estimated Effort: **Medium**

### 2) Middleware enforces dashboard staff gate but API auth is route-by-route
- Risk Level: **Medium**
- Impact: missing auth on a new API route would be easy to introduce.
- Evidence: middleware matcher includes `/api/:path*` but contains no API authorization gate (`middleware.ts:19-32`).
- Recommended Fix: add centralized API auth middleware patterns by route class (public, staff, service-token).
- Estimated Effort: **Medium**

### 3) API token scope model is functional but governance path is missing
- Risk Level: **Medium**
- Impact: unclear operational control over token issuance/revocation/rotation.
- Evidence: token service exists (`src/lib/api-token-service.ts`) but no audited admin UI/flow in routes/actions.
- Recommended Fix: implement and enforce ADMIN-only token lifecycle endpoints with audit logging + expiry defaults.
- Estimated Effort: **Medium**

### 4) Role enforcement is strongest in actions, weaker in pages
- Risk Level: **Low**
- Impact: viewers can access some pages that perform expensive org reads (even if no edit controls).
- Evidence: many pages gate actions by `hasMinimumRole` in UI only; mutation actions use `requireStaffUser("EDITOR")`.
- Recommended Fix: keep action-level enforcement, but add route-level role checks for ADMIN/EDITOR-only views where needed.
- Estimated Effort: **Low**

## Positive Controls
- Login rate limiting with Redis fallback (`src/lib/security/login-rate-limit.ts`).
- API scope checks correctly reject missing/invalid tokens (`src/lib/auth/require-api-scope.ts`).
