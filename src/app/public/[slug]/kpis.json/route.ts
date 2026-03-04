import { db } from "@/lib/db";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = await params

  const org = await getOrganizationBySlug(resolvedParams.slug)

  const kpis = await db().kPI.findMany({
    where: {
      organizationId: org.id,
      isPublic: true
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      name: true,
      value: true,
      unit: true,
      periodLabel: true,
      createdAt: true
    }
  })

  return Response.json({
    organization: org.name,
    total: kpis.length,
    data: kpis
  })
}
