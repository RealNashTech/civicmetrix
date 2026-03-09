export type QualityScoreInput = {
  totalRecords: number;
  missingFieldCount: number;
  validationFailureCount: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateQualityScore(metrics: QualityScoreInput): number {
  const totalRecords = Math.max(0, metrics.totalRecords);
  const missingFieldCount = Math.max(0, metrics.missingFieldCount);
  const validationFailureCount = Math.max(0, metrics.validationFailureCount);

  if (totalRecords === 0) {
    return 100;
  }

  const missingFieldRate = missingFieldCount / totalRecords;
  const validationFailureRate = validationFailureCount / totalRecords;

  const score = 100 - missingFieldRate * 5 - validationFailureRate * 10;
  return Math.round(clamp(score, 0, 100));
}
