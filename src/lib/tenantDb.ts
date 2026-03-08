import { dbSystem } from "@/lib/db"

export async function tenantDb<T>(
  organizationId: string,
  fn: (tx: any) => Promise<T>
): Promise<T> {
  const client = dbSystem()

  return client.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT set_config('app.current_tenant', ${organizationId}, true)
    `
    return fn(tx)
  })
}
