import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  userFindManyMock,
  txUserFindManyMock,
  transactionMock,
  txExecuteRawMock,
  getTenantContextMock,
  getTenantIdFromRequestHeadersMock,
} = vi.hoisted(() => ({
  userFindManyMock: vi.fn(),
  txUserFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  txExecuteRawMock: vi.fn(),
  getTenantContextMock: vi.fn(),
  getTenantIdFromRequestHeadersMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: transactionMock,
    user: {
      findMany: userFindManyMock,
    },
  },
}))

vi.mock("@/lib/tenant-context", () => ({
  getTenantContext: getTenantContextMock,
  getTenantIdFromRequestHeaders: getTenantIdFromRequestHeadersMock,
}))

vi.mock("@/lib/observability/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/lib/observability/metrics", () => ({
  recordDbQuery: vi.fn(),
}))

vi.mock("@/lib/observability/process-errors", () => ({
  installProcessErrorHandlers: vi.fn(),
}))

import { db, dbSystem } from "@/lib/db"

describe("db tenant enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        $executeRaw: txExecuteRawMock,
        user: {
          findMany: txUserFindManyMock,
        },
      })
    )

    txExecuteRawMock.mockResolvedValue(1)
    userFindManyMock.mockResolvedValue([])
    txUserFindManyMock.mockResolvedValue([])

    getTenantContextMock.mockReturnValue(null)
    getTenantIdFromRequestHeadersMock.mockResolvedValue(null)
  })

  it("request execution without tenant context throws", async () => {
    await expect(db().user.findMany({ where: {} })).rejects.toThrow("Tenant context not set")
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it("db() executes when trusted tenant context exists", async () => {
    getTenantContextMock.mockReturnValue({ organizationId: "org_1" })

    await db().user.findMany({ where: {} })

    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(txExecuteRawMock).toHaveBeenCalledTimes(1)
    expect(txUserFindManyMock).toHaveBeenCalledWith({ where: {} })
  })

  it("dbSystem() allows execution without tenant context", async () => {
    await expect(dbSystem().user.findMany({ where: {} })).resolves.toEqual([])
    expect(transactionMock).not.toHaveBeenCalled()
    expect(userFindManyMock).toHaveBeenCalledWith({ where: {} })
  })
})
