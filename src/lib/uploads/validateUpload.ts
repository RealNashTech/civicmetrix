export const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
export const MIN_UPLOAD_ROWS = 1;
export const MAX_UPLOAD_ROWS = 50_000;

export class UploadValidationError extends Error {
  status: number;

  constructor(message: string, status: number = 400) {
    super(message);
    this.name = "UploadValidationError";
    this.status = status;
  }
}

type ValidateUploadInput = {
  fileSizeBytes: number;
  rowCount: number;
};

export function validateUpload({ fileSizeBytes, rowCount }: ValidateUploadInput) {
  if (fileSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    throw new UploadValidationError("File exceeds 20MB size limit.");
  }

  if (rowCount < MIN_UPLOAD_ROWS) {
    throw new UploadValidationError("Spreadsheet must contain at least 1 data row.");
  }

  if (rowCount > MAX_UPLOAD_ROWS) {
    throw new UploadValidationError("Spreadsheet exceeds maximum row limit of 50,000.");
  }
}

