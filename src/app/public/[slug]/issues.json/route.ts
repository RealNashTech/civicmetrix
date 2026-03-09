import { z } from "zod";

import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { tenantDb } from "@/lib/tenantDb";

export const revalidate = 300;

const pagingSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().min(1).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const paging = pagingSchema.parse({
    limit: url.searchParams.get("limit"),
    offset: url.searchParams.get("offset"),
    cursor: url.searchParams.get("cursor") ?? undefined,
  });

  const org = await getOrganizationBySlug(slug);

  const issues = await tenantDb(org.id, async (tx) => {
    return tx.issueReport.findMany({
      where: {
        organizationId: org.id,
      },
      orderBy: { createdAt: "desc" },
      ...(paging.cursor
        ? {
            cursor: { id: paging.cursor },
            skip: 1,
          }
        : {
            skip: paging.offset,
          }),
      take: paging.limit + 1,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    });
  });

  const hasMore = issues.length > paging.limit;
  const pageData = hasMore ? issues.slice(0, paging.limit) : issues;
  const nextCursor = hasMore ? pageData[pageData.length - 1]?.id ?? null : null;

  return Response.json({
    organization: org.name,
    pagination: {
      limit: paging.limit,
      offset: paging.cursor ? null : paging.offset,
      cursor: paging.cursor ?? null,
      nextCursor,
      hasMore,
      returned: pageData.length,
    },
    data: pageData,
  });
}
