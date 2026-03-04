import prisma from "@/lib/prisma"

let middlewareRegistered = false

if (!middlewareRegistered) {
  const clientWithMiddleware = prisma as typeof prisma & {
    $use?: (
      handler: (
        params: unknown,
        next: (params: unknown) => Promise<unknown>
      ) => Promise<unknown>
    ) => void
  }

  clientWithMiddleware.$use?.(async (params, next) => {
    const start = Date.now()

    const result = await next(params)

    const duration = Date.now() - start

    if (duration > 200) {
      const query = params as { model?: string; action?: string }

      console.log(
        "[db] slow query",
        query.model,
        query.action,
        duration + "ms"
      )
    }

    return result
  })

  middlewareRegistered = true
}

export function db() {
  return prisma
}
