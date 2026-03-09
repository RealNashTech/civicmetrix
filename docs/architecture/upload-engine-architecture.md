# CivicMetrix Universal Upload System Architecture

## 1. Purpose

The CivicMetrix Universal Upload System is the core municipal workflow engine for structured data intake across the platform. It enables city employees to upload operational spreadsheets and automatically populate CivicMetrix data structures with validated, normalized, and organization-scoped records.

The primary goals are to:
- Reduce manual data entry across municipal workflows.
- Standardize incoming data from inconsistent source files.
- Accelerate downstream analytics, reporting, and dashboard updates.

## 2. Supported File Types

The upload system supports the following file types:
- `.xlsx`
- `.csv`
- `.ods`

Excel files (`.xlsx`) are the primary expected format for municipal staff and partner agencies.

## 3. Upload Processing Pipeline

The upload pipeline is defined as:

Upload  
↓  
File parser  
↓  
Column detection  
↓  
Mapping assistant  
↓  
Data normalization  
↓  
Municipal data registry  
↓  
Worker analytics + dashboards

### Stage Explanations

1. Upload
- User uploads a supported file in an organization-scoped context.
- System captures metadata (uploader, organization, timestamp, file type, file size).

2. File parser
- File content is parsed server-side into a common internal table format.
- Headers, row counts, sheet selection (if applicable), and parse errors are captured.

3. Column detection
- Parsed headers and sample values are evaluated against known CivicMetrix field definitions.
- Candidate mappings are generated with confidence scores.

4. Mapping assistant
- User confirms, adjusts, or rejects auto-detected mappings in UI.
- Required fields are enforced before import can proceed.

5. Data normalization
- Values are standardized using registry-backed aliases and normalization rules.
- Type conversion and canonicalization are applied before validation/write.

6. Municipal data registry
- Normalized values resolve against shared records (or create queued suggestions, based on policy).
- Referential integrity checks are performed.

7. Worker analytics + dashboards
- Successful imports enqueue worker jobs to recalculate analytics and refresh dependent dashboards.

## 4. File Parsing Layer

Server-side parsing will use Node.js libraries:
- `xlsx` for `.xlsx` and `.ods` workbook parsing (or equivalent ODS-capable integration path).
- `csv-parse` for `.csv` ingestion with delimiter and encoding handling.

Parsing output must be converted into a normalized row/column structure:
- `headers: string[]`
- `rows: Array<Record<string, string | number | boolean | null>>`
- `sourceMetadata: { sheetName?, rowCount, columnCount, parseWarnings[] }`

Key behaviors:
- Trim header whitespace.
- Preserve raw source value and parsed value where needed for auditing.
- Support configurable first-row-as-header behavior.
- Reject malformed files with actionable error messages.

## 5. Column Detection

Automatic column detection maps source columns to CivicMetrix fields using:
- Header-name matching (exact, normalized, alias-based).
- Fuzzy string matching (token similarity, abbreviation expansion).
- Value-shape heuristics (e.g., lat/long numeric ranges, budget currency patterns).
- Dataset-context hints (selected import type, organization history).

Common municipal examples include:
- `Asset Name`
- `Department`
- `Condition`
- `Latitude`
- `Longitude`
- `Budget`

The detector should produce:
- Suggested target field.
- Confidence score.
- Reason trace (e.g., alias match, heuristic match).

## 6. Data Mapping Assistant

The mapping assistant is a UI workflow where users confirm or correct detected fields before execution.

Example mapping UI model:

Spreadsheet Column -> CivicMetrix Field  
`Asset_Name` -> `Infrastructure Asset Name`  
`Dept` -> `Department`  
`CondScore` -> `Condition Score`

Workflow requirements:
- Show auto-detected mappings with confidence badges.
- Require explicit resolution for required fields.
- Allow skip/ignore for non-required columns.
- Preview transformed sample rows prior to import.
- Save finalized mappings as reusable templates per organization.

Template behavior:
- Template keys include organization, dataset type, and file signature heuristics.
- Templates are versioned and editable.
- Future uploads can auto-apply matching templates.

## 7. Municipal Data Registry

The Municipal Data Registry is the shared canonical layer for normalized entities, including:
- Departments
- Infrastructure Assets
- Grants
- Issues
- Programs
- Budgets

All uploaded data must resolve against registry records before final write. Resolution behaviors:
- Match existing canonical record by ID, alias, or configured key fields.
- Flag unresolved references for user correction or controlled create flow.
- Maintain organization scoping and cross-entity integrity constraints.

## 8. Data Normalization

Normalization occurs before database writes and includes:
- Whitespace trimming and case normalization.
- Alias resolution.
- Enum standardization.
- Numeric/date coercion.
- Geospatial normalization (lat/long precision rules).

Example alias normalization:
- `Public Works`
- `PW`
- `public works`

-> `Department = Public Works`

Normalization design requirements:
- Registry-backed alias dictionaries.
- Deterministic, auditable transformation rules.
- Per-organization override support where policy allows.

## 9. Import Execution

Final import execution performs:
- Validated record assembly.
- Bulk insert/upsert via Prisma in transactional batches.
- Import audit logging.
- Worker queue trigger emission for analytics refresh.

Execution requirements:
- Enforce schema-level validation and required constraints.
- Use bounded batch sizes for large uploads.
- Fail fast on structural errors; support row-level error reporting where safe.
- Persist import session state (`pending`, `processing`, `completed`, `failed`).

Audit log fields should include:
- `importId`
- `organizationId`
- `uploadedByUserId`
- `sourceFileName`
- `mappingTemplateId?`
- `rowCounts` (total/valid/failed)
- `startedAt`, `completedAt`
- `errorSummary`

## 10. Dashboards and Analytics Trigger

After successful import, the system triggers worker pipelines that update:
- Infrastructure dashboards
- Grant dashboards
- Civic intelligence signals

Trigger behavior:
- Publish domain-specific jobs to queue(s) with organization scope.
- Recompute only impacted aggregates where possible.
- Track job status and expose refresh progress in UI.

## 11. Reporting Integration

Uploaded data must automatically feed reporting pipelines for:
- Council reports
- Infrastructure condition reports
- Grant compliance reports
- Transparency exports

Integration expectations:
- Reporting datasets read from normalized registry-backed tables.
- Import lineage is retained so report values are traceable to source imports.
- Scheduled and on-demand report generation use the same canonical data contracts.

## 12. Security and Validation

Required protections:
- Organization-scoped imports (strict tenant isolation).
- Row validation for required fields and type constraints.
- Schema validation against dataset-specific contracts.
- File size limits and row-count guardrails.
- Upload audit logging and immutable import history.

Additional controls:
- File MIME/type verification (not extension-only).
- Virus/malware scanning integration point.
- Authorization checks for upload/import actions.
- Rate limiting and abuse protections.

## 13. Future Enhancements

Planned improvements:
- AI-assisted column detection with confidence explanations.
- Automatic dataset classification by content/profile.
- Federal reporting template ingestion and guided mapping packs.
- Active learning from corrected mappings to improve suggestions.
- Data quality scoring and anomaly detection during import.
