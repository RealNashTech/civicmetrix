import { dbSystem } from "@/lib/db";
import PublicGrantCard from "@/components/public/PublicGrantCard"
import PublicEmptyState from "@/components/public/PublicEmptyState"
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug"
import GrantTimelineChart from "@/components/public/GrantTimelineChart"

export const revalidate = 300

interface PageProps {
  params: Promise<{
    slug: string
  }>
  searchParams?: Promise<{
    page?: string
  }>
}

export default async function PublicGrantsPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  const parsedPage = Number(resolvedSearchParams?.page ?? 1)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const PAGE_SIZE = 10

  const organization = await getOrganizationBySlug(resolvedParams.slug)
  const totalGrants = await dbSystem().grant.count({
    where: {
      organizationId: organization.id,
      isPublic: true
    }
  })
  const totalPages = Math.max(1, Math.ceil(totalGrants / PAGE_SIZE))

  const grants = await dbSystem().grant.findMany({
    where: {
      organizationId: organization.id,
      isPublic: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    select: {
      id: true,
      name: true,
      amount: true,
      createdAt: true
    }
  })

  const timelineData = grants
    .map((g) => ({
      date: new Date(g.createdAt).toISOString().slice(0, 10),
      amount: Number(g.amount ?? 0)
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const cumulativeTimeline = timelineData.reduce<Array<{ date: string; amount: number }>>(
    (acc, point) => {
      const previousAmount = acc.length > 0 ? acc[acc.length - 1].amount : 0
      acc.push({
        date: point.date,
        amount: previousAmount + point.amount
      })
      return acc
    },
    []
  )

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-semibold">
        {organization.name} Grants
      </h1>
      <p className="text-sm text-gray-500">
        Showing {grants.length} of {totalGrants} grants
      </p>
      <div className="flex gap-4 pt-2">
        <a
          href={`/public/${resolvedParams.slug}/grants.csv`}
          className="text-sm px-3 py-2 border rounded-md hover:bg-gray-50"
        >
          Download CSV
        </a>

        <a
          href={`/public/${resolvedParams.slug}/grants.json`}
          className="text-sm px-3 py-2 border rounded-md hover:bg-gray-50"
        >
          JSON API
        </a>
      </div>

      <div className="pt-6 pb-4">
        <h2 className="text-lg font-semibold">
          Grant Funding Over Time
        </h2>

        <GrantTimelineChart data={cumulativeTimeline} />
      </div>

      {grants.length === 0 && (
        <PublicEmptyState message="No public grants available." />
      )}

      {grants.map((grant) => (
        <PublicGrantCard
          key={grant.id}
          grant={{
            id: grant.id,
            name: grant.name,
            amount: grant.amount ? Number(grant.amount) : null
          }}
        />
      ))}

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
  )
}
