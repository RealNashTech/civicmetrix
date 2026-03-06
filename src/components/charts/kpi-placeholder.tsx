export function KpiPlaceholderChart() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-800">KPI Trend Placeholder</h3>
      <div className="mt-4 h-56 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="grid h-full grid-cols-6 items-end gap-3">
          {[38, 58, 46, 72, 66, 84].map((height, index) => (
            <div
              key={index}
              className="rounded-t bg-slate-500"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
