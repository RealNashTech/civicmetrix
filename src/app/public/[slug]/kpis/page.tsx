import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import PublicKpiCard from "@/components/public/PublicKpiCard";
import PublicEmptyState from "@/components/public/PublicEmptyState";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function PublicKpiPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const parsedPage = Number(resolvedSearch?.page ?? 1)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const PAGE_SIZE = 10;

  const org = await getOrganizationBySlug(resolvedParams.slug);

  const totalKpis = await db().kPI.count({
    where: {
      organizationId: org.id,
      isPublic: true
    }
  })
  const totalPages = Math.max(1, Math.ceil(totalKpis / PAGE_SIZE))

  const kpis = await db().kPI.findMany({
    where: {
      organizationId: org.id,
      isPublic: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    select: {
      id: true,
      name: true,
      value: true,
      unit: true,
      periodLabel: true,
      createdAt: true,
      history: {
        orderBy: {
          recordedAt: "asc"
        },
        take: 6,
        select: {
          value: true
        }
      }
    }
  });

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{org.name} KPIs</h1>
        <p className="text-muted-foreground">
          Public performance indicators.
        </p>
        <p className="text-sm text-gray-500">
          Showing {kpis.length} of {totalKpis} KPIs
        </p>
        <div className="flex gap-4 pt-2">
          <a
            href={`/public/${resolvedParams.slug}/kpis.csv`}
            className="text-sm px-3 py-2 border rounded-md hover:bg-gray-50"
          >
            Download CSV
          </a>

          <a
            href={`/public/${resolvedParams.slug}/kpis.json`}
            className="text-sm px-3 py-2 border rounded-md hover:bg-gray-50"
          >
            JSON API
          </a>
        </div>
      </div>

      <div className="space-y-4">
        {kpis.length === 0 && (
          <PublicEmptyState message="No public metrics available yet." />
        )}

        {kpis.map((kpi) => (
          <PublicKpiCard
            key={kpi.id}
            kpi={{
              id: kpi.id,
              name: kpi.name,
              value: kpi.value ? Number(kpi.value) : null,
              unit: kpi.unit ?? null,
              periodLabel: kpi.periodLabel ?? null,
              createdAt: kpi.createdAt,
              trend: kpi.history.map((h) => Number(h.value))
            }}
          />
        ))}
      </div>

      <div className="flex justify-between items-center pt-6">
        {page > 1 ? (
          <a
            href={`?page=${page - 1}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Previous
          </a>
        ) : (
          <span />
        )}

        <span className="text-sm text-gray-500">
          Page {page} of {totalPages}
        </span>

        <a
          href={`?page=${page + 1}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Next →
        </a>
      </div>
    </div>
  );
}
