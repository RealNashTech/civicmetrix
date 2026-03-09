import path from "path";
import { readFile } from "fs/promises";

import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";

export type UploadFileType = "xlsx" | "csv" | "ods";

export type ParsedUploadData = {
  columns: string[];
  rows: Record<string, unknown>[];
};

const SUPPORTED_EXTENSION_TO_TYPE: Record<string, UploadFileType> = {
  ".xlsx": "xlsx",
  ".csv": "csv",
  ".ods": "ods",
};

const SUPPORTED_MIME_TO_TYPE: Record<string, UploadFileType> = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
  "application/csv": "csv",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
};

function normalizeHeader(value: unknown, index: number): string {
  const raw = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (raw.length > 0) {
    return raw;
  }
  return `Column_${index + 1}`;
}

function rowHasData(row: Record<string, unknown>): boolean {
  return Object.values(row).some((value) => {
    if (value == null) {
      return false;
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return true;
  });
}

export function detectUploadFileType(fileName: string, mimeType?: string): UploadFileType | null {
  const extension = path.extname(fileName).toLowerCase();
  const fromExtension = SUPPORTED_EXTENSION_TO_TYPE[extension];
  if (fromExtension) {
    return fromExtension;
  }

  if (!mimeType) {
    return null;
  }

  return SUPPORTED_MIME_TO_TYPE[mimeType] ?? null;
}

async function parseCsvFile(filePath: string): Promise<ParsedUploadData> {
  const fileContent = await readFile(filePath, "utf8");
  const parsed = parseCsv(fileContent, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as unknown[];

  const matrix = Array.isArray(parsed) ? (parsed as unknown[][]) : [];
  if (matrix.length === 0) {
    return { columns: [], rows: [] };
  }

  const headerRow = Array.isArray(matrix[0]) ? matrix[0] : [];
  const columns = headerRow.map((header, index) => normalizeHeader(header, index));
  const rows = matrix
    .slice(1)
    .map((row) => {
      const rowValues = Array.isArray(row) ? row : [];
      const normalizedRow: Record<string, unknown> = {};
      columns.forEach((column, index) => {
        normalizedRow[column] = rowValues[index] ?? null;
      });
      return normalizedRow;
    })
    .filter(rowHasData);

  return { columns, rows };
}

async function parseSpreadsheetFile(filePath: string): Promise<ParsedUploadData> {
  const workbook = XLSX.readFile(filePath, { cellDates: false, raw: false });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return { columns: [], rows: [] };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: false,
  }) as unknown[][];

  if (matrix.length === 0) {
    return { columns: [], rows: [] };
  }

  const headerRow = Array.isArray(matrix[0]) ? matrix[0] : [];
  const columns = headerRow.map((header, index) => normalizeHeader(header, index));
  const rows = matrix
    .slice(1)
    .map((row) => {
      const rowValues = Array.isArray(row) ? row : [];
      const normalizedRow: Record<string, unknown> = {};
      columns.forEach((column, index) => {
        normalizedRow[column] = rowValues[index] ?? null;
      });
      return normalizedRow;
    })
    .filter(rowHasData);

  return { columns, rows };
}

export async function parseUploadFile(
  filePath: string,
  fileType: UploadFileType,
): Promise<ParsedUploadData> {
  if (fileType === "csv") {
    return parseCsvFile(filePath);
  }

  return parseSpreadsheetFile(filePath);
}
