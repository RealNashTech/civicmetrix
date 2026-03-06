-- Add operational indexes for tenant worker scans.

CREATE INDEX IF NOT EXISTS "grant_next_report_due_idx"
  ON "Grant" ("nextReportDue");

CREATE INDEX IF NOT EXISTS "issue_report_sla_scan_idx"
  ON "IssueReport" ("slaBreached", "status", "slaResponseDueAt", "slaResolutionDueAt");

CREATE INDEX IF NOT EXISTS "event_processed_created_idx"
  ON "Event" ("processed", "createdAt");
