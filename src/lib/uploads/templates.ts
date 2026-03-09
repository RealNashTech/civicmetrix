type MappingRecord = Record<string, string>;

export type SuggestedUploadTemplate = {
  templateId: string;
  templateName: string;
  entityType: string;
  datasetType: string;
  similarity: number;
};

function normalizeColumnName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeFieldToColumnMapping(mapping: unknown): MappingRecord {
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
    return {};
  }

  const entries = Object.entries(mapping as Record<string, unknown>);
  const normalizedEntries = entries
    .map(([fieldName, columnName]) => {
      if (typeof fieldName !== "string" || typeof columnName !== "string") {
        return null;
      }
      const normalizedField = fieldName.trim();
      const normalizedColumn = columnName.trim();
      if (!normalizedField || !normalizedColumn) {
        return null;
      }
      return [normalizedField, normalizedColumn] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  return Object.fromEntries(normalizedEntries);
}

export function toMapApiMapping(fieldToColumn: MappingRecord): MappingRecord {
  const mapApiEntries = Object.entries(fieldToColumn).map(([field, column]) => [column, field]);
  return Object.fromEntries(mapApiEntries);
}

export function templateSimilarity(detectedColumns: string[], fieldToColumn: MappingRecord): number {
  const detectedSet = new Set(detectedColumns.map(normalizeColumnName));
  const templateColumns = Object.values(fieldToColumn).map(normalizeColumnName);

  if (detectedSet.size === 0 || templateColumns.length === 0) {
    return 0;
  }

  const matched = templateColumns.filter((column) => detectedSet.has(column)).length;
  return matched / templateColumns.length;
}

export function suggestTemplates(
  detectedColumns: string[],
  templates: Array<{
    id: string;
    templateName: string;
    entityType: string;
    datasetType: string;
    mappingJSON: unknown;
  }>,
): SuggestedUploadTemplate[] {
  return templates
    .map((template) => {
      const fieldToColumn = normalizeFieldToColumnMapping(template.mappingJSON);
      const similarity = templateSimilarity(detectedColumns, fieldToColumn);
      return {
        templateId: template.id,
        templateName: template.templateName,
        entityType: template.entityType,
        datasetType: template.datasetType,
        similarity: Math.round(similarity * 100) / 100,
      };
    })
    .filter((candidate) => candidate.similarity >= 0.7)
    .sort((left, right) => right.similarity - left.similarity);
}
