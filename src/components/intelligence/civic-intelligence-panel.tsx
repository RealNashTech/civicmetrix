type CivicAlert = {
  title: string;
  value: number;
  description: string;
  color: "red" | "amber" | "orange" | "blue" | "purple";
};

const alerts: CivicAlert[] = [
  {
    title: "Critical Issues",
    value: 4,
    description: "Open citizen reports requiring immediate response",
    color: "red",
  },
  {
    title: "Grant Compliance Risk",
    value: 2,
    description: "Grants approaching compliance deadlines",
    color: "amber",
  },
  {
    title: "Service Backlog",
    value: 7,
    description: "Work orders exceeding SLA targets",
    color: "orange",
  },
  {
    title: "Declining KPIs",
    value: 3,
    description: "Performance indicators trending downward",
    color: "blue",
  },
  {
    title: "Issue Clusters",
    value: 5,
    description: "Geographic clusters of citizen reports detected",
    color: "purple",
  },
];

function accentClass(color: CivicAlert["color"]) {
  if (color === "red") {
    return "border-l-4 border-l-rose-500";
  }
  if (color === "amber") {
    return "border-l-4 border-l-amber-500";
  }
  if (color === "orange") {
    return "border-l-4 border-l-orange-500";
  }
  if (color === "blue") {
    return "border-l-4 border-l-blue-500";
  }
  return "border-l-4 border-l-purple-500";
}

export function CivicIntelligencePanel() {
  return (
    <section className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-slate-500">Civic Intelligence</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {alerts.map((alert) => (
          <article
            key={alert.title}
            className={`rounded-lg border bg-white p-4 shadow-sm ${accentClass(alert.color)}`}
          >
            <p className="text-sm font-medium text-slate-700">{alert.title}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{alert.value}</p>
            <p className="mt-2 text-xs text-slate-500">{alert.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
