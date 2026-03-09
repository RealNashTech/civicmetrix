import Link from "next/link";

import PublicGrantCard from "@/components/public/PublicGrantCard";
import PublicEmptyState from "@/components/public/PublicEmptyState";
import PublicTransparencyCharts from "@/app/public/[slug]/PublicTransparencyCharts";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { tenantDb } from "@/lib/tenantDb";

export const revalidate = 300;

type GrantsPageData = {
  totalGrants: number;
  grants: Array<{
    id: string;
    name: string;
    amount: unknown;
    department: { name: string } | null;
  }>;
  grantsByDepartmentRaw: Array<{ departmentId: string | null; _sum: { amount: unknown } }>;
  departments: Array<{ id: string; name: string }>;
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string }>;
};

export default async function PublicGrantsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const parsedPage = Number(resolvedSearch?.page ?? 1);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const PAGE_SIZE = 10;

  const organization = await getOrganizationBySlug(slug);

  const data = await tenantDb<GrantsPageData>(organization.id, async (tx) => {
    const totalGrants = await tx.grant.count({
      where: {
        organizationId: organization.id,
        isPublic: true,
      },
    });

    const [grants, grantsByDepartmentRaw, departments] = await Promise.all([
      tx.grant.findMany({
        where: {
          organizationId: organization.id,
          isPublic: true,
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: {
          department: { select: { name: true } },
        },
      }),
      tx.grant.groupBy({
        by: ["departmentId"],
        where: {
          organizationId: organization.id,
          isPublic: true,
        },
        _sum: { amount: true },
      }),
      tx.department.findMany({
        where: { organizationId: organization.id },
        select: { id: true, name: true },
      }),
    ]);

    return {
      totalGrants,
      grants,
      grantsByDepartmentRaw,
      departments,
    };
  });

  const totalPages = Math.max(1, Math.ceil(data.totalGrants / PAGE_SIZE));

  const departmentMap = new Map((data.departments as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]));
  const grantFundingByDepartment = (
    data.grantsByDepartmentRaw as Array<{ departmentId: string | null; _sum: { amount: unknown } }>
  )
    .map((row) => ({
      department: row.departmentId ? departmentMap.get(row.departmentId) ?? "Unknown" : "Unassigned",
      amount: Number(row._sum.amount ?? 0),
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <Link href={`/public/${slug}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Public Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{organization.name} Grants</h1>
      </div>

      <div className="flex gap-3">
        <a href={`/public/${slug}/grants.csv`} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-100">
          Download CSV
        </a>
        <a href={`/public/${slug}/grants.json`} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-100">
          JSON API
        </a>
      </div>

      <PublicTransparencyCharts grantFundingByDepartment={grantFundingByDepartment} />

      {data.grants.length === 0 ? <PublicEmptyState message="No public grants available." /> : null}

      {(data.grants as Array<{ id: string; name: string; amount: unknown }>).map((grant) => (
        <PublicGrantCard
          key={grant.id}
          grant={{
            id: grant.id,
            name: grant.name,
            amount: grant.amount ? Number(grant.amount) : null,
          }}
        />
      ))}

      <div className="flex items-center justify-between pt-4 text-sm">
        {page > 1 ? (
          <a href={`?page=${page - 1}`} className="text-blue-600 hover:underline">
            ← Previous
          </a>
        ) : (
          <span />
        )}
        <span className="text-slate-500">Page {page} of {totalPages}</span>
        {page < totalPages ? (
          <a href={`?page=${page + 1}`} className="text-blue-600 hover:underline">
            Next →
          </a>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
