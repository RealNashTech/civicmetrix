import { dbSystem } from "@/lib/db";

export function getTenantDb(organizationId: string) {
  const db = dbSystem();

  return {
    issueReport: {
      findMany: (args: any = {}) =>
        db.issueReport.findMany({
          ...args,
          where: {
            ...args.where,
            organizationId,
          },
        }),
    },

    grant: {
      findMany: (args: any = {}) =>
        db.grant.findMany({
          ...args,
          where: {
            ...args.where,
            organizationId,
          },
        }),
    },

    kpi: {
      findMany: (args: any = {}) =>
        db.kPI.findMany({
          ...args,
          where: {
            ...args.where,
            organizationId,
          },
        }),
    },

    asset: {
      findMany: (args: any = {}) =>
        db.asset.findMany({
          ...args,
          where: {
            ...args.where,
            organizationId,
          },
        }),
    },
  };
}
