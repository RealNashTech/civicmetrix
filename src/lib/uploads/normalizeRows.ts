type RawRow = Record<string, unknown>;
type NormalizedRow = Record<string, unknown>;

export function normalizeRow(row: RawRow, mapping: Record<string, string>): NormalizedRow {
  const normalized: NormalizedRow = {};
  for (const [sourceColumn, targetField] of Object.entries(mapping)) {
    normalized[targetField] = row[sourceColumn];
  }
  return normalized;
}
