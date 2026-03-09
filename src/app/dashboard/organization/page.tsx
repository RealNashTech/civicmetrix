import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { requireAnyRole, RoleAccessError } from "@/lib/permissions";
import { tenantDb } from "@/lib/tenantDb";

type OrganizationProfile = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

type OrganizationUser = {
  id: string;
  name: string;
  email: string;
  legacyRole: string;
  role: { name: string } | null;
  createdAt: Date;
};

type OrganizationApiKey = {
  id: string;
  name: string;
  scope: string;
  tokenPrefix: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

type OrganizationDataSource = {
  id: string;
  name: string;
  type: string;
  entityType: string | null;
  uploadedBy: string;
  createdAt: Date;
};

type OrganizationImportEvent = {
  id: string;
  type: string;
  entityType: string;
  processed: boolean;
  createdAt: Date;
  processedAt: Date | null;
};

type OrganizationAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  createdAt: Date;
};

type OrganizationControlCenterData = {
  organization: OrganizationProfile | null;
  users: OrganizationUser[];
  apiKeys: OrganizationApiKey[];
  dataSources: OrganizationDataSource[];
  importHistory: OrganizationImportEvent[];
  auditLogs: OrganizationAuditLog[];
};

function formatDate(value: Date | null | undefined): string {
  if (!value) {
    return "Never";
  }
  return new Date(value).toLocaleString();
}

export default async function OrganizationControlCenterPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  try {
    await requireAnyRole(["SYSTEM_ADMIN", "CITY_ADMIN"], session.user);
  } catch (error) {
    if (error instanceof RoleAccessError) {
      notFound();
    }
    throw error;
  }

  const organizationId = requireOrganization(session);

  const data = await tenantDb<OrganizationControlCenterData>(organizationId, async (tx) => {
    const [organization, users, apiKeys, dataSources, importHistory, auditLogs] = await Promise.all([
      tx.organization.findFirst({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      tx.user.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          name: true,
          email: true,
          legacyRole: true,
          role: {
            select: { name: true },
          },
          createdAt: true,
        },
      }),
      tx.apiToken.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          name: true,
          scope: true,
          tokenPrefix: true,
          createdAt: true,
          expiresAt: true,
          lastUsedAt: true,
          revokedAt: true,
        },
      }),
      tx.document.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          type: true,
          entityType: true,
          uploadedBy: true,
          createdAt: true,
        },
      }),
      tx.event.findMany({
        where: {
          organizationId,
          OR: [
            { type: { contains: "IMPORT", mode: "insensitive" } },
            { type: { contains: "UPLOAD", mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          entityType: true,
          processed: true,
          createdAt: true,
          processedAt: true,
        },
      }),
      tx.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          userId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      organization,
      users,
      apiKeys,
      dataSources,
      importHistory,
      auditLogs,
    };
  });

  if (!data.organization) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Organization Control Center</h1>
        <p className="text-sm text-slate-600">
          Tenant-scoped governance, integrations, and operational visibility.
        </p>
        <Link href="/dashboard/organization/roles" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Manage Roles
        </Link>
      </div>

      <Card title="Organization Profile">
        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
          <p>
            <span className="font-medium text-slate-900">Name:</span> {data.organization.name}
          </p>
          <p>
            <span className="font-medium text-slate-900">Slug:</span> {data.organization.slug}
          </p>
          <p>
            <span className="font-medium text-slate-900">Created:</span>{" "}
            {formatDate(data.organization.createdAt)}
          </p>
          <p>
            <span className="font-medium text-slate-900">Last Updated:</span>{" "}
            {formatDate(data.organization.updatedAt)}
          </p>
        </div>
      </Card>

      <Card title="Users">
        <p className="mb-3 text-xs text-slate-500">{data.users.length} recent users</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Role</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 text-slate-900">{user.name}</td>
                  <td className="py-2 pr-2">{user.email}</td>
                  <td className="py-2 pr-2">{user.role?.name ?? user.legacyRole}</td>
                  <td className="py-2">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
              {data.users.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={4}>
                    No users found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="API Keys">
        <p className="mb-3 text-xs text-slate-500">{data.apiKeys.length} keys</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Scope</th>
                <th className="py-2 pr-2">Prefix</th>
                <th className="py-2 pr-2">Last Used</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.apiKeys.map((key) => (
                <tr key={key.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 text-slate-900">{key.name}</td>
                  <td className="py-2 pr-2">{key.scope}</td>
                  <td className="py-2 pr-2 font-mono text-xs">{key.tokenPrefix ?? "N/A"}</td>
                  <td className="py-2 pr-2">{formatDate(key.lastUsedAt)}</td>
                  <td className="py-2">{key.revokedAt ? "Revoked" : "Active"}</td>
                </tr>
              ))}
              {data.apiKeys.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={5}>
                    No API keys found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Data Sources">
        <p className="mb-3 text-xs text-slate-500">{data.dataSources.length} recent uploads</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Entity</th>
                <th className="py-2 pr-2">Uploaded By</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.dataSources.map((source) => (
                <tr key={source.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 text-slate-900">{source.name}</td>
                  <td className="py-2 pr-2">{source.type}</td>
                  <td className="py-2 pr-2">{source.entityType ?? "N/A"}</td>
                  <td className="py-2 pr-2">{source.uploadedBy}</td>
                  <td className="py-2">{formatDate(source.createdAt)}</td>
                </tr>
              ))}
              {data.dataSources.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={5}>
                    No data source uploads found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Import History">
        <p className="mb-3 text-xs text-slate-500">{data.importHistory.length} recent import events</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Entity</th>
                <th className="py-2 pr-2">Processed</th>
                <th className="py-2 pr-2">Created</th>
                <th className="py-2">Processed At</th>
              </tr>
            </thead>
            <tbody>
              {data.importHistory.map((event) => (
                <tr key={event.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 text-slate-900">{event.type}</td>
                  <td className="py-2 pr-2">{event.entityType}</td>
                  <td className="py-2 pr-2">{event.processed ? "Yes" : "No"}</td>
                  <td className="py-2 pr-2">{formatDate(event.createdAt)}</td>
                  <td className="py-2">{formatDate(event.processedAt)}</td>
                </tr>
              ))}
              {data.importHistory.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={5}>
                    No import events found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Audit Log Access">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{data.auditLogs.length} recent audit events</p>
          <Link href="/dashboard/audit" className="text-sm font-medium text-blue-600 hover:underline">
            Open Full Audit Log
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr className="border-b">
                <th className="py-2 pr-2">Action</th>
                <th className="py-2 pr-2">Entity</th>
                <th className="py-2 pr-2">Entity ID</th>
                <th className="py-2 pr-2">User</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.auditLogs.map((entry) => (
                <tr key={entry.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-2 text-slate-900">{entry.action}</td>
                  <td className="py-2 pr-2">{entry.entityType}</td>
                  <td className="py-2 pr-2">{entry.entityId}</td>
                  <td className="py-2 pr-2">{entry.userId}</td>
                  <td className="py-2">{formatDate(entry.createdAt)}</td>
                </tr>
              ))}
              {data.auditLogs.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-500" colSpan={5}>
                    No audit log records found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
