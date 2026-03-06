import prisma from "@/lib/prisma"
import { getObservabilityContext } from "@/lib/observability/context"
import { logger } from "@/lib/observability/logger"
import { recordDbQuery } from "@/lib/observability/metrics"
import { installProcessErrorHandlers } from "@/lib/observability/process-errors"
import { getTenantContext, getTenantIdFromRequestHeaders } from "@/lib/tenant-context"

type QueryMetadata = {
  model?: string
  action?: string
  args?: unknown
}

type DbLike = typeof prisma

type TransactionOptions = Parameters<typeof prisma.$transaction>[1]

type DbMode = "tenant" | "system"

const RAW_METHODS = new Set([
  "$queryRaw",
  "$executeRaw",
  "$queryRawUnsafe",
  "$executeRawUnsafe",
])

installProcessErrorHandlers()

async function resolveTenantId(): Promise<string | null> {
  const contextTenant = getTenantContext()?.organizationId
  if (contextTenant) {
    return contextTenant
  }

  const headerTenant = await getTenantIdFromRequestHeaders()
  if (headerTenant) {
    return headerTenant
  }

  return null
}

async function resolveTenantIdForExecution(): Promise<string> {
  const tenantId = await resolveTenantId()
  if (!tenantId) {
    throw new Error("Tenant context not set")
  }

  return tenantId
}

function onQuerySuccess(metadata: QueryMetadata, tenantId: string, startedAt: number) {
  const duration = Date.now() - startedAt
  const isSlow = duration > 200
  recordDbQuery(duration, isSlow)

  logger.info(isSlow ? "db_slow_query" : "db_query", {
    requestId: getObservabilityContext()?.requestId,
    tenantId,
    model: metadata.model ?? null,
    action: metadata.action ?? null,
    latency: duration,
  })
}

function onQueryError(metadata: QueryMetadata, tenantId: string, startedAt: number, error: unknown) {
  const duration = Date.now() - startedAt

  logger.error("db_query_failed", {
    requestId: getObservabilityContext()?.requestId,
    tenantId,
    model: metadata.model ?? null,
    action: metadata.action ?? null,
    latency: duration,
    error: error instanceof Error ? error.message : String(error),
  })
}

function isModelDelegate(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false
  }

  const delegate = value as Record<string, unknown>
  return (
    typeof delegate.findUnique === "function" ||
    typeof delegate.findFirst === "function" ||
    typeof delegate.findMany === "function" ||
    typeof delegate.create === "function" ||
    typeof delegate.update === "function" ||
    typeof delegate.delete === "function"
  )
}

function invokeModelAction(client: DbLike, model: string, action: string, args: unknown[]): Promise<unknown> {
  const delegate = (client as unknown as Record<string, unknown>)[model] as
    | Record<string, unknown>
    | undefined

  if (!delegate) {
    throw new Error(`Unknown Prisma model delegate: ${model}`)
  }

  const method = delegate[action]
  if (typeof method !== "function") {
    throw new Error(`Unknown Prisma action ${model}.${action}`)
  }

  return (method as (...params: unknown[]) => Promise<unknown>).apply(delegate, args)
}

async function runWithTenantTransaction<T>(
  tenantId: string,
  operation: (tx: DbLike) => Promise<T>
): Promise<T> {
  if (typeof prisma.$transaction !== "function") {
    return operation(prisma as DbLike)
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`
    return operation(tx as DbLike)
  })
}

function createTransactionClientProxy(tx: DbLike, tenantLabel: string): DbLike {
  return new Proxy(tx, {
    get(target, property, receiver) {
      const prop = String(property)
      const value = Reflect.get(target, property, receiver)

      if (RAW_METHODS.has(prop) && typeof value === "function") {
        return async (...args: unknown[]) => {
          const startedAt = Date.now()
          try {
            const result = await (value as (...params: unknown[]) => Promise<unknown>).apply(target, args)
            onQuerySuccess({ action: prop, args: args[0] }, tenantLabel, startedAt)
            return result
          } catch (error) {
            onQueryError({ action: prop, args: args[0] }, tenantLabel, startedAt, error)
            throw error
          }
        }
      }

      if (!isModelDelegate(value)) {
        return value
      }

      return new Proxy(value, {
        get(delegateTarget, actionProperty, delegateReceiver) {
          const action = String(actionProperty)
          const actionValue = Reflect.get(delegateTarget, actionProperty, delegateReceiver)
          if (typeof actionValue !== "function") {
            return actionValue
          }

          return async (...args: unknown[]) => {
            const metadata: QueryMetadata = {
              model: prop,
              action,
              args: args[0],
            }
            const startedAt = Date.now()

            try {
              const result = await invokeModelAction(target as DbLike, prop, action, args)
              onQuerySuccess(metadata, tenantLabel, startedAt)
              return result
            } catch (error) {
              onQueryError(metadata, tenantLabel, startedAt, error)
              throw error
            }
          }
        },
      })
    },
  }) as DbLike
}

function createDbClientProxy(mode: DbMode): DbLike {
  return new Proxy(prisma, {
    get(target, property, receiver) {
      const prop = String(property)

      if (prop === "$transaction") {
        return async (input: unknown, options?: TransactionOptions): Promise<unknown> => {
          const tenantId = mode === "tenant" ? await resolveTenantIdForExecution() : null
          const tenantLabel = tenantId ?? "system"

          if (typeof prisma.$transaction !== "function") {
            if (typeof input !== "function") {
              throw new Error(
                "Tenant-scoped transactions require callback style: db().$transaction(async (tx) => { ... })"
              )
            }

            return (input as (client: DbLike) => Promise<unknown>)(prisma as DbLike)
          }

          if (typeof input === "function") {
            return prisma.$transaction(async (tx) => {
              if (tenantId) {
                await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`
              }

              const scopedTx = createTransactionClientProxy(tx as DbLike, tenantLabel)
              return (input as (client: DbLike) => Promise<unknown>)(scopedTx)
            }, options)
          }

          if (Array.isArray(input)) {
            throw new Error(
              "Tenant-scoped transactions require callback style: db().$transaction(async (tx) => { ... })"
            )
          }

          throw new Error("Invalid transaction input")
        }
      }

      const value = Reflect.get(target, property, receiver)

      if (RAW_METHODS.has(prop) && typeof value === "function") {
        return async (...args: unknown[]) => {
          const metadata: QueryMetadata = { action: prop, args: args[0] }
          const tenantId = mode === "tenant" ? await resolveTenantIdForExecution() : null
          const tenantLabel = tenantId ?? "system"
          const startedAt = Date.now()

          try {
            const result = tenantId
              ? await runWithTenantTransaction(tenantId, async (tx) =>
                  (tx as unknown as Record<string, (...params: unknown[]) => Promise<unknown>>)[prop](...args)
                )
              : await (value as (...params: unknown[]) => Promise<unknown>).apply(target, args)

            onQuerySuccess(metadata, tenantLabel, startedAt)
            return result
          } catch (error) {
            onQueryError(metadata, tenantLabel, startedAt, error)
            throw error
          }
        }
      }

      if (!isModelDelegate(value)) {
        return value
      }

      return new Proxy(value, {
        get(delegateTarget, actionProperty, delegateReceiver) {
          const action = String(actionProperty)
          const actionValue = Reflect.get(delegateTarget, actionProperty, delegateReceiver)
          if (typeof actionValue !== "function") {
            return actionValue
          }

          return async (...args: unknown[]) => {
            const metadata: QueryMetadata = {
              model: prop,
              action,
              args: args[0],
            }

            const tenantId = mode === "tenant" ? await resolveTenantIdForExecution() : null
            const tenantLabel = tenantId ?? "system"
            const startedAt = Date.now()

            try {
              const result = tenantId
                ? await runWithTenantTransaction(tenantId, (tx) =>
                    invokeModelAction(tx, prop, action, args)
                  )
                : await invokeModelAction(target as DbLike, prop, action, args)

              onQuerySuccess(metadata, tenantLabel, startedAt)
              return result
            } catch (error) {
              onQueryError(metadata, tenantLabel, startedAt, error)
              throw error
            }
          }
        },
      })
    },
  }) as DbLike
}

export function db() {
  return createDbClientProxy("tenant")
}

export function dbSystem() {
  return createDbClientProxy("system")
}
