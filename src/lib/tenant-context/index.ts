import { AsyncLocalStorage } from "node:async_hooks";

import { headers } from "next/headers";

import { AppRole } from "@/types/roles";

import { StaffPrincipal } from "@/lib/policies/base";

type ApiTokenPrincipal = {
  organizationId: string;
  scope: string;
  id?: string;
};

export type TenantContext = {
  organizationId: string;
  principalType: "staff" | "api-token";
  principalId: string;
  role?: AppRole;
  scope?: string;
};

const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

export function staffTenantContext(staff: StaffPrincipal): TenantContext {
  return {
    organizationId: staff.organizationId,
    principalType: "staff",
    principalId: staff.id,
    role: String(staff.role).toUpperCase() as AppRole,
  };
}

export function apiTokenTenantContext(token: ApiTokenPrincipal): TenantContext {
  return {
    organizationId: token.organizationId,
    principalType: "api-token",
    principalId: token.id ?? "api-token",
    scope: token.scope,
  };
}

export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
  return tenantContextStorage.run(context, fn);
}

export function setTenantContext(context: TenantContext) {
  tenantContextStorage.enterWith(context);
}

export function getTenantContext() {
  return tenantContextStorage.getStore() ?? null;
}

export async function getTenantIdFromRequestHeaders() {
  try {
    const headerStore = await headers();
    return headerStore.get("x-civicmetrix-tenant");
  } catch {
    return null;
  }
}
