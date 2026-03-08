# Compliance Readiness Audit (SOC2 / CJIS-style / NIST-style)

## Scope
- Access control, auditability, data isolation, operational controls.

## Current Readiness Summary
- Strong start on RBAC, audit logging, and tenant segmentation intent.
- Not yet production-ready for high-assurance government deployment.

## Findings

### 1) Tenant isolation controls are not uniformly enforced
- Risk Level: **Critical**
- Impact: fails core logical access segregation expectations (SOC2 CC6/CC7, NIST AC family).
- Evidence: critical `db()` context gaps on public/citizen surfaces and partial RLS coverage.
- Recommended Fix: enforce complete tenant context + RLS on all tenant tables with automated policy tests.
- Estimated Effort: **High**

### 2) Audit logs lack integrity hardening
- Risk Level: **High**
- Impact: limited non-repudiation; forensic trust reduced.
- Evidence: app-level inserts only (`src/lib/audit.ts`), no immutability controls/WORM/export signing.
- Recommended Fix: append-only controls, signed export chain, restricted write paths, retention policy.
- Estimated Effort: **Medium**

### 3) Access governance for service/API tokens is incomplete
- Risk Level: **Medium**
- Impact: weak lifecycle governance (issuance/rotation/revocation evidence).
- Recommended Fix: ADMIN-only token management workflows with mandatory expiry and periodic attestation.
- Estimated Effort: **Medium**

### 4) Incident response and monitoring maturity is limited
- Risk Level: **Medium**
- Impact: slower detection/containment during security events.
- Evidence: no centralized alerting pipeline; in-memory metrics only.
- Recommended Fix: implement SIEM/log forwarding, alert runbooks, on-call escalation paths.
- Estimated Effort: **Medium**

### 5) Security testing breadth is insufficient for regulated deployment
- Risk Level: **Medium**
- Impact: control failures may reach production.
- Evidence: limited integration/E2E suite for authz/tenant abuse scenarios.
- Recommended Fix: add adversarial authz tests, tenant-boundary tests, and release blocking gates.
- Estimated Effort: **Medium**
