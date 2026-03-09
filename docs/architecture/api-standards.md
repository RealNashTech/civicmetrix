# API Standards

## Standard Response Structure
All API responses should use a consistent contract.

### Success
```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Notes:
- `meta` is optional.
- `data` contains endpoint payload.

### Error
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid input"
  }
}
```

## Error Codes Registry
Defined in:
- `src/lib/api/errorCodes.ts`

Current codes:
- `NOT_FOUND`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `INVALID_REQUEST`
- `INTERNAL_ERROR`
- `DEPENDENCY_FAILURE`

## Response Helpers
Defined in:
- `src/lib/api/response.ts`

Helpers:
- `ok(data, meta?, status?)`
- `error(code, message, status?)`

These helpers return `NextResponse.json(...)` using the standard contract.

## Handler Wrapper
Defined in:
- `src/lib/api/handler.ts`

Wrapper:
- `apiHandler(async (req) => { ... })`

Behavior:
- executes route handler in `try/catch`
- converts thrown errors to standardized error responses
- preserves explicit handler responses

## Migration Plan For Existing Routes
1. Keep current routes unchanged during scaffolding rollout.
2. For each route module, replace ad-hoc JSON responses with `ok(...)` and `error(...)`.
3. Wrap handlers with `apiHandler(...)` to centralize error normalization.
4. Migrate by route group (`/api/public`, `/api/dashboard`, `/api/internal`) to reduce risk.
5. Validate response contracts with integration tests before/after each migration batch.

This staged approach ensures contract consistency without changing endpoint behavior abruptly.
