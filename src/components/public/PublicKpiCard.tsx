import KpiSparkline from "./KpiSparkline"

interface PublicKpiCardProps {
  kpi: {
    id: string
    name: string
    value?: number | null
    unit?: string | null
    periodLabel?: string | null
    createdAt: Date
    trend?: number[]
  }
}

export default function PublicKpiCard({ kpi }: PublicKpiCardProps) {
  const value = Number(kpi.value ?? 0)
  const percent = Math.max(0, Math.min(value, 100))

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex justify-between">
        <span className="font-medium">{kpi.name}</span>
        <span className="text-sm text-muted-foreground">
          {kpi.value ?? "-"} {kpi.unit ?? ""}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-600 h-3 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      {kpi.trend && kpi.trend.length > 1 && (
        <KpiSparkline values={kpi.trend} />
      )}

      <div className="text-xs text-muted-foreground flex justify-between">
        <span>
          {kpi.periodLabel ? `Period: ${kpi.periodLabel}` : ""}
        </span>

        <span>
          Updated: {new Date(kpi.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}
