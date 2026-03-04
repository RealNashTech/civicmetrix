import { KPIStatus } from "@prisma/client";

type CalculateKpiStatusInput = {
  value: number;
  target: number | null;
};

export function calculateKpiStatus({
  value,
  target,
}: CalculateKpiStatusInput): KPIStatus {
  if (target == null || Number.isNaN(target) || target <= 0) {
    return KPIStatus.ON_TRACK;
  }

  if (value >= target) {
    return KPIStatus.ON_TRACK;
  }

  if (value >= target * 0.8) {
    return KPIStatus.AT_RISK;
  }

  return KPIStatus.OFF_TRACK;
}
