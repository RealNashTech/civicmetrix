import type { InfrastructureRiskLevel } from "@prisma/client";

export function calculateRiskLevel(conditionScore: number): InfrastructureRiskLevel {
  if (conditionScore >= 80) {
    return "LOW";
  }

  if (conditionScore >= 50) {
    return "MEDIUM";
  }

  return "HIGH";
}
