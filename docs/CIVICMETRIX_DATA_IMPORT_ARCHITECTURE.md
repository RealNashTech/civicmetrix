# CivicMetrix Data Import Architecture

## 1. System Overview
CivicMetrix Data Upload System is a tenant-safe ingestion platform for municipal datasets in:
- CSV
- Excel (`.xlsx`)
- GeoJSON (`.geojson`, `.json`)
- Shapefile (`.zip` bundle with `.shp/.shx/.dbf/.prj`)

Primary goals:
- Strict tenant isolation per `organizationId`
- Deterministic, auditable imports
- Human-assisted mapping for inconsistent municipal source files
- Asynchronous processing via worker queues
- First-class integration with `tenantDb` and Prisma models:
  - `Asset`
  - `Grant`
  - `IssueReport`
  - `KPI`

High-level flow:
1. User uploads file through authenticated dashboard route.
2. API stores file + creates `ImportJob` and `ImportFile` metadata rows.
3. Parser extracts schema preview and candidate mappings.
4. User confirms/edits mapping in UI.
5. Worker processes file in batches inside `tenantDb(organizationId, ...)` transaction scopes.
6. Rows are validated, transformed, and upserted/created in target Prisma models.
7. Import summary + row-level errors become downloadable reports.

---

## 2. Upload API
### Endpoints
- `POST /api/imports/files`
  - Accept multipart upload + import target (`ASSET|GRANT|ISSUE|KPI`)
  - Creates `ImportJob` in `UPLOADED` state
  - Returns `importJobId`, file metadata, detected format
- `POST /api/imports/:jobId/preview`
  - Generates parsed headers/field candidates + sample rows
  - Returns inferred type metadata
- `POST /api/imports/:jobId/mapping`
  - Saves user mapping configuration and starts queue job
- `GET /api/imports/:jobId/status`
  - Poll import progress and counters
- `GET /api/imports/:jobId/errors`
  - Download row-level error report (CSV/JSON)

### Tenant-safety requirements
- Resolve tenant from authenticated session context.
- Validate `job.organizationId === session.organizationId` on every call.
- Never accept `organizationId` from request body as authoritative.
- API writes must run via `tenantDb(session.organizationId, async (tx) => ...)`.

---

## 3. File Storage Model
Use two-layer storage:
1. **Object storage** (primary): immutable raw source files and generated error reports.
2. **Database metadata** (Prisma): import tracking and auditability.

### Proposed Prisma entities
- `ImportJob`
  - `id`, `organizationId`, `uploadedBy`, `targetModel`, `status`
  - `fileId`, `mappingConfig` (JSON), `validationProfile` (JSON)
  - counters: `totalRows`, `processedRows`, `successRows`, `errorRows`
  - timestamps: `createdAt`, `startedAt`, `completedAt`
- `ImportFile`
  - `id`, `organizationId`, `storageKey`, `originalName`, `mimeType`, `sizeBytes`, `checksum`
- `ImportError`
  - `id`, `organizationId`, `jobId`, `rowNumber`, `columnName`, `errorCode`, `errorMessage`, `rawValue`
- `ImportAudit`
  - immutable event stream (`JOB_CREATED`, `MAPPING_SAVED`, `JOB_STARTED`, `ROW_FAILED`, `JOB_COMPLETED`)

Storage key convention:
- `imports/{organizationId}/{jobId}/source/{filename}`
- `imports/{organizationId}/{jobId}/reports/errors.csv`

---

## 4. Parsing Pipeline
### Format adapters
- CSV adapter: delimiter detection + encoding detection + streaming row iterator
- Excel adapter: first sheet default + selectable sheet + typed cell extraction
- GeoJSON adapter: `FeatureCollection` normalization
- Shapefile adapter: unzip + convert feature geometries/properties to GeoJSON-like records

### Internal normalized row contract
Each parser outputs:
- `rowNumber`
- `raw` (original key-value)
- `normalized` (trimmed keys, canonical null handling)

### Geometry handling
- GeoJSON/Shapefile geometry converted to:
  - `latitude`, `longitude` (point centroid for non-point geometries when needed)
  - optional raw `geometry` kept in import metadata for auditing

### Batch strategy
- Stream records and process in chunks (e.g., 500 rows/chunk)
- Each chunk processed in isolated `tenantDb` transaction
- Supports resume/retry by chunk cursor

---

## 5. Validation Rules
Validation runs at 3 layers:
1. **File-level**
   - extension/mime whitelist
   - max size limits
   - required sheet/layer checks
2. **Schema-level**
   - required mapped columns exist
   - no duplicate target field mappings
3. **Row-level**
   - required fields non-empty
   - type checks (`number`, `date`, enum)
   - range checks (e.g., `conditionScore 0..100`, lat/lon bounds)
   - relational checks (department existence within same tenant)

### Model-specific required targets
- `Asset`
  - required: `name`, `type` (or default), optional `conditionScore`, `latitude`, `longitude`
- `Grant`
  - required: `name`, `amount`, optional `department`, `status`, `isPublic`
- `IssueReport`
  - required: `title`, `description`, `category`, optional coordinates/status
- `KPI`
  - required: `name`, `value`, optional `unit`, `target`, `status`, `isPublic`

Invalid rows are skipped with `ImportError` records; import continues.

---

## 6. Column Mapping UI
### UX flow
1. Upload file
2. Review detected columns + sample rows
3. Select target model (`Asset`, `Grant`, `IssueReport`, `KPI`)
4. Map source columns to target fields
5. Configure transforms/defaults
6. Validate mapping
7. Start import

### Mapping capabilities
- Direct map (`source_col -> target_field`)
- Value transforms:
  - trim
  - uppercase/lowercase
  - parse currency to decimal
  - date format parsing
  - enum mapping (e.g., `At Risk -> AT_RISK`)
- Defaults (`isPublic=true`, `status=OPEN`, etc.)
- Derived fields (e.g., full address -> components)

### Saved mapping templates
Support tenant-scoped mapping templates:
- `organizationId`-bound
- reusable by department users
- versioned for auditability

---

## 7. Import Worker Queue
Queue name: `data-imports`

Job types:
- `import.preview`
- `import.execute`
- `import.retry-row`
- `import.generate-report`

Worker behavior:
- Lock `ImportJob` state transitions (`UPLOADED -> PARSED -> RUNNING -> COMPLETED|FAILED`)
- Process chunked records with idempotency key:
  - `{jobId}:{rowNumber}:{targetModel}`
- Every DB write goes through:
  - `tenantDb(organizationId, async (tx) => { ... })`
- Emit progress updates to `ImportJob`
- Push catastrophic failures to DLQ (`dead-letter`)

Idempotency strategy:
- Track processed row hashes in `ImportJobProgress` table or Redis set
- Safe retry without duplicate inserts

---

## 8. Error Handling
### Error classes
- `IMPORT_FILE_INVALID`
- `IMPORT_MAPPING_INVALID`
- `IMPORT_ROW_VALIDATION_FAILED`
- `IMPORT_ROW_RELATION_NOT_FOUND`
- `IMPORT_DB_CONSTRAINT`
- `IMPORT_SYSTEM_FAILURE`

### Behavior
- Row errors are non-fatal by default.
- File/parser corruption or schema mismatch may fail entire job.
- Worker crash recovery resumes from last successful chunk.

### Outputs
- Real-time status counters on job
- Row-level error table + downloadable CSV
- Final summary:
  - total rows
  - imported rows
  - failed rows
  - top failure reasons

---

## 9. Security Model
### Access control
- Import endpoints restricted to staff roles (`ADMIN|EDITOR`, configurable)
- Tenant ownership checked on every read/write
- Audit log event for every import action

### Tenant isolation
- All writes scoped by `organizationId`
- Import workers must receive `organizationId` from trusted job metadata only
- Worker DB actions wrapped in `tenantDb(organizationId, ...)`
- No cross-tenant joins without explicit system-level approval path

### File security
- Virus/malware scanning hook before processing
- Block executable extensions and nested archive abuse
- Store only immutable originals; parsed derivatives are separate artifacts

### Data protection
- Signed URLs for downloading source/error reports
- Encrypt object storage at rest
- Redact sensitive values from logs

---

## 10. Example Municipal Datasets
### Asset import examples
- Streetlight inventory
- Water main asset register
- Bridge inspection index
- Sidewalk segment condition list

Mapped to `Asset`:
- `asset_name -> name`
- `asset_type -> type`
- `health_score -> conditionScore`
- `lat/lng -> latitude/longitude`

### Grant import examples
- Federal grant awards
- State transportation grant pipeline
- Department compliance calendar

Mapped to `Grant`:
- `grant_title -> name`
- `award_amount -> amount`
- `dept_name -> departmentId (lookup by tenant department)`

### Issue import examples
- Legacy 311 exports
- Public works ticket backlog

Mapped to `IssueReport`:
- `ticket_title -> title`
- `ticket_desc -> description`
- `issue_type -> category`
- `opened_date -> createdAt (optional if allowed)`

### KPI import examples
- Public safety KPI monthly values
- Budget utilization KPI feeds

Mapped to `KPI`:
- `metric_name -> name`
- `metric_value -> value`
- `target_value -> target`
- `unit_label -> unit`

---

## Integration Requirements (Non-Negotiable)
- Every import execution path must use `tenantDb`.
- Every persisted record must include trusted `organizationId` scoping.
- Target model writes must align with Prisma contracts for:
  - `Asset`
  - `Grant`
  - `IssueReport`
  - `KPI`
- Import state transitions and outputs must be auditable and reproducible.
