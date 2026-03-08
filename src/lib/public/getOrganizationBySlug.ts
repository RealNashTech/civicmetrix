import { dbSystem } from "@/lib/db";
import { notFound } from "next/navigation"

export async function getOrganizationBySlug(slug: string) {
  const org = await dbSystem().organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true
    }
  })

  if (!org) {
    notFound()
  }

  return org
}
