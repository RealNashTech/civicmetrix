import { dbSystem } from "@/lib/db";
import { RBAC_ROLES } from "@/lib/permissions";
import { tenantDb } from "@/lib/tenantDb";

async function seedRoles() {
  const organizations = await dbSystem().organization.findMany({
    select: { id: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  for (const organization of organizations) {
    await tenantDb(organization.id, async (tx) => {
      await tx.role.createMany({
        data: RBAC_ROLES.map((name) => ({
          organizationId: organization.id,
          name,
        })),
        skipDuplicates: true,
      });
    });
    console.log(`Seeded roles for ${organization.slug}`);
  }
}

seedRoles()
  .catch((error) => {
    console.error("Failed to seed roles", error);
    process.exit(1);
  })
  .finally(async () => {
    await dbSystem().$disconnect();
  });
