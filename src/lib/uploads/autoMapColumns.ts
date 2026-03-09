import { fieldRegistry } from "@/lib/uploads/fieldRegistry";

const MATCH_THRESHOLD = 0.75;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function scoreAliasMatch(columnName: string, alias: string): number {
  const normalizedColumn = normalize(columnName);
  const normalizedAlias = normalize(alias);

  if (!normalizedColumn || !normalizedAlias) {
    return 0;
  }

  if (normalizedColumn === normalizedAlias) {
    return 1;
  }

  if (
    normalizedColumn.length >= 4 &&
    normalizedAlias.length >= 4 &&
    (normalizedColumn.includes(normalizedAlias) || normalizedAlias.includes(normalizedColumn))
  ) {
    return 0.85;
  }

  const columnTokens = new Set(tokenize(columnName));
  const aliasTokens = new Set(tokenize(alias));
  if (columnTokens.size === 0 || aliasTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of columnTokens) {
    if (aliasTokens.has(token)) {
      intersection += 1;
    }
  }
  const union = columnTokens.size + aliasTokens.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function autoMapColumns(datasetType: string, detectedColumns: string[]): Record<string, string> {
  const fields = fieldRegistry[datasetType];
  if (!fields || detectedColumns.length === 0) {
    return {};
  }

  const candidates: Array<{
    column: string;
    field: string;
    score: number;
  }> = [];

  for (const column of detectedColumns) {
    let bestField = "";
    let bestScore = 0;

    for (const [field, aliases] of Object.entries(fields)) {
      let fieldBest = 0;
      for (const alias of aliases) {
        fieldBest = Math.max(fieldBest, scoreAliasMatch(column, alias));
      }
      if (fieldBest > bestScore) {
        bestScore = fieldBest;
        bestField = field;
      }
    }

    if (bestField && bestScore >= MATCH_THRESHOLD) {
      candidates.push({ column, field: bestField, score: bestScore });
    }
  }

  candidates.sort((left, right) => right.score - left.score);

  const mappedFields = new Set<string>();
  const mapping: Record<string, string> = {};
  for (const candidate of candidates) {
    if (mappedFields.has(candidate.field)) {
      continue;
    }
    mapping[candidate.column] = candidate.field;
    mappedFields.add(candidate.field);
  }

  return mapping;
}
