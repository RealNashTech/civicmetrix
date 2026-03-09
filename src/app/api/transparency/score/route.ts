import { z } from "zod";

import { auth } from "@/lib/auth";
import { dbSystem } from "@/lib/db";
import { getTransparencyReportByOrganizationId } from "@/lib/transparency/transparency-report";

const querySchema = z.object({
  organizationId: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    organizationId: url.searchParams.get("organizationId") ?? undefined,
    slug: url.searchParams.get("slug") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: "Invalid transparency score query." }, { status: 400 });
  }

  let organizationId = parsed.data.organizationId ?? null;

  if (!organizationId && parsed.data.slug) {
    const organization = await dbSystem().organization.findUnique({
      where: { slug: parsed.data.slug },
      select: { id: true },
    });

    if (!organization) {
      return Response.json({ error: "Organization not found." }, { status: 404 });
    }

    organizationId = organization.id;
  }

  if (!organizationId) {
    const session = await auth();
    organizationId = session?.user?.organizationId ?? null;
  }

  if (!organizationId) {
    return Response.json(
      { error: "Provide slug or organizationId, or call the endpoint as an authenticated staff user." },
      { status: 400 },
    );
  }

  const report = await getTransparencyReportByOrganizationId(organizationId);

  return Response.json({
    organization: report.organization.name,
    transparencyScore: report.score.score,
    grade: report.score.grade,
    strengths: report.score.strengths,
    gaps: report.score.gaps,
    missingDataAreas: report.score.missingDataAreas,
    reportingCompleteness: report.score.reportingCompleteness,
    dataAvailability: report.score.dataAvailability,
    breakdown: {
      grantDisclosure: report.score.grantReportingCompleteness,
      infrastructureConditionReporting: report.score.infrastructureReportingCompleteness,
      kpiAvailability: report.score.kpiAvailability,
      budgetTransparency: report.score.budgetTransparency,
      departmentReportingCoverage: report.score.departmentReportingCoverage,
      publicIssueReportingAvailable: report.score.publicIssueReportingAvailable,
      openCivicIssues: report.score.openCivicIssues,
    },
  });
}
