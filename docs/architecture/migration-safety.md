# Migration Safety

## Overview
CivicMetrix includes a pre-deploy migration safety check to detect high-risk SQL operations before rollout.

Safety script:
- `scripts/check-migrations.ts`

Command:
- `npm run check:migrations`

Deployment guard:
- `scripts/deploy-check.sh` runs migration checks before health/readiness/metrics verification.

## Migration Review Process
1. Create and review Prisma migration SQL in `prisma/migrations/*/migration.sql`.
2. Run `npm run check:migrations` locally or in CI.
3. If the check fails, require manual architecture and data safety review.
4. Approve a rollback plan before production deploy.
5. Proceed with deployment checks only after migration validation passes.

## Dangerous Operations
The safety check currently blocks migrations containing:
- `DROP TABLE`
- `DROP COLUMN`
- `ALTER COLUMN TYPE`
- `ALTER TABLE ... RENAME`
- `DELETE FROM`

These operations can cause data loss, breaking schema drift, or application/runtime incompatibilities.

## Rollback Planning
For any migration that modifies existing production data or schema contracts:
- define a rollback path before deploy,
- capture affected tables/columns and expected data impact,
- define restore strategy (backup restore, compensating migration, or hotfix),
- validate rollback timing and operational owner.

## Production Migration Guidelines
- Prefer additive and backward-compatible migrations.
- Avoid destructive schema operations in the same release as app-level contract changes.
- Split large changes into phased migrations and backfills.
- Run migration checks in CI and pre-deploy gates.
- Require explicit signoff for high-risk SQL operations even after manual review.
