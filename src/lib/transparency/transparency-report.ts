import { dbSystem } from "@/lib/db";
import { calculateTransparencyScore } from "@/lib/transparency/transparency-engine";
import type { TransparencyScore } from "@/lib/transparency/transparency-score";

export type TransparencyReport = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  generatedAt: string;
  score: TransparencyScore;
};

export async function getTransparencyReportByOrganizationId(
  organizationId: string,
): Promise<TransparencyReport> {
  const organization = await dbSystem().organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!organization) {
    throw new Error(`Organization ${organizationId} not found.`);
  }

  const score = await calculateTransparencyScore(organization.id);

  return {
    organization,
    generatedAt: new Date().toISOString(),
    score,
  };
}

export async function getTransparencyReportBySlug(slug: string): Promise<TransparencyReport | null> {
  const organization = await dbSystem().organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!organization) {
    return null;
  }

  const score = await calculateTransparencyScore(organization.id);

  return {
    organization,
    generatedAt: new Date().toISOString(),
    score,
  };
}
