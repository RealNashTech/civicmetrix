import { FieldValidationRule, validationRegistry } from "@/lib/uploads/validationRegistry";

type RowData = Record<string, unknown>;

export type InvalidRow = {
  row: number;
  errors: string[];
};

export type ValidateRowsResult = {
  validRows: RowData[];
  invalidRows: InvalidRow[];
  warnings: string[];
};

function isMissing(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  return false;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const normalized = Number(value.trim());
    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }
  return null;
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

function validateField(field: string, rule: FieldValidationRule, row: RowData, errors: string[]) {
  const rawValue = row[field];

  if (rule.required && isMissing(rawValue)) {
    errors.push(`${field} is required.`);
    return;
  }

  if (isMissing(rawValue)) {
    return;
  }

  if (rule.type === "string") {
    if (typeof rawValue !== "string") {
      errors.push(`${field} must be a string.`);
      return;
    }
    row[field] = rawValue.trim();
    return;
  }

  if (rule.type === "number") {
    const numeric = parseNumber(rawValue);
    if (numeric == null) {
      errors.push(`${field} must be a number.`);
      return;
    }
    if (typeof rule.min === "number" && numeric < rule.min) {
      errors.push(`${field} must be greater than or equal to ${rule.min}.`);
    }
    if (typeof rule.max === "number" && numeric > rule.max) {
      errors.push(`${field} must be less than or equal to ${rule.max}.`);
    }
    row[field] = numeric;
    return;
  }

  if (rule.type === "date") {
    const parsed = parseDate(rawValue);
    if (parsed == null) {
      errors.push(`${field} must be a valid date.`);
      return;
    }
    row[field] = parsed;
  }
}

export function validateRows(datasetType: string, mappedRows: RowData[]): ValidateRowsResult {
  const datasetRules = validationRegistry[datasetType];
  if (!datasetRules) {
    return {
      validRows: mappedRows,
      invalidRows: [],
      warnings: [],
    };
  }

  const validRows: RowData[] = [];
  const invalidRows: InvalidRow[] = [];
  const warnings: string[] = [];

  mappedRows.forEach((inputRow, index) => {
    const row = { ...inputRow };
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(datasetRules)) {
      validateField(field, rule, row, errors);
    }

    if (errors.length > 0) {
      invalidRows.push({
        row: index + 1,
        errors,
      });
      warnings.push(`Row ${index + 1}: ${errors.join(" ")}`);
      return;
    }

    validRows.push(row);
  });

  return {
    validRows,
    invalidRows,
    warnings,
  };
}
