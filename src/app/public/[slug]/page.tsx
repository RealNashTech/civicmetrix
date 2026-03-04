import { db } from "@/lib/db";
import Link from "next/link"
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug"

export const revalidate = 300

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicPage({ params }: Props) {
  const resolvedParams = await params;

  const org = await getOrganizationBySlug(resolvedParams.slug);

  const kpis = await db().kPI.findMany({
    where: {
      organizationId: org.id,
      isPublic: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{org.name}</h1>
        <p className="text-muted-foreground">
          Public Performance Dashboard
        </p>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-8">

          <Link
            href={`/public/${resolvedParams.slug}/transparency`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              Transparency Dashboard
            </h2>

            <p className="text-sm text-muted-foreground">
              Public KPI metrics, performance, and civic operations snapshot.
            </p>
          </Link>

          <Link
            href={`/public/${resolvedParams.slug}/kpis`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              View KPIs
            </h2>

            <p className="text-sm text-muted-foreground">
              Public performance indicators and progress metrics.
            </p>
          </Link>

          <Link
            href={`/public/${resolvedParams.slug}/kpi`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              KPI Trends
            </h2>

            <p className="text-sm text-muted-foreground">
              Historical KPI trend charts over the past year.
            </p>
          </Link>

          <Link
            href={`/public/${resolvedParams.slug}/grants`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              View Grants
            </h2>

            <p className="text-sm text-muted-foreground">
              Public grant awards and funding transparency.
            </p>
          </Link>

          <Link
            href={`/public/${resolvedParams.slug}/departments`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              View Departments
            </h2>

            <p className="text-sm text-muted-foreground">
              Department accountability with public KPIs and grants.
            </p>
          </Link>

          <Link
            href={`/public/${resolvedParams.slug}/programs`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              View Programs
            </h2>

            <p className="text-sm text-muted-foreground">
              Program transparency with budgets, KPIs, and grants.
            </p>
          </Link>

          <Link
            href={`/public/${resolvedParams.slug}/budget`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              Budget Explorer
            </h2>

            <p className="text-sm text-muted-foreground">
              Department and program budget allocation transparency.
            </p>
          </Link>

          <Link
            href={`/public/${resolvedParams.slug}/infrastructure`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              Infrastructure
            </h2>

            <p className="text-sm text-muted-foreground">
              Asset condition and infrastructure service performance.
            </p>
          </Link>

          <Link
            href={`/public/${resolvedParams.slug}/goals`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              Strategic Goals
            </h2>

            <p className="text-sm text-muted-foreground">
              City strategic plan goals and objective progress.
            </p>
          </Link>

          <Link
            href={`/public/${resolvedParams.slug}/report-issue`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              Report Issue
            </h2>

            <p className="text-sm text-muted-foreground">
              Submit civic issues directly to the city operations team.
            </p>
          </Link>

          <Link
            href={`/public/${resolvedParams.slug}/issues`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              Issue Status
            </h2>

            <p className="text-sm text-muted-foreground">
              Track open and resolved civic issues with map visibility.
            </p>
          </Link>

          <Link
            href={`/public/${resolvedParams.slug}/map`}
            className="border rounded-lg p-6 hover:bg-gray-50 transition"
          >
            <h2 className="text-lg font-semibold">
              Civic Map
            </h2>

            <p className="text-sm text-muted-foreground">
              Public issue density, infrastructure layers, and service zones.
            </p>
          </Link>

        </div>
      </div>

      <div className="space-y-4">
        {kpis.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No public metrics available yet.
          </p>
        )}

        {kpis.map((kpi) => {
          const value = Number(kpi.value ?? 0);
          const percent = Math.max(0, Math.min(value, 100));

          return (
            <div key={kpi.id} className="border rounded-lg p-4 space-y-2">
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

              <div className="text-xs text-muted-foreground flex justify-between">
                <span>
                  {kpi.periodLabel ? `Period: ${kpi.periodLabel}` : ""}
                </span>

                <span>
                  Updated: {new Date(kpi.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}




