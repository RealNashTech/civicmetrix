import Link from "next/link";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { db } from "@/lib/db";
import { AppRole } from "@/types/roles";

import { createAsset } from "./actions";

export default async function AssetsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const role = user.role as AppRole;
  const canManage = hasMinimumRole(role, "EDITOR");

  const [assets, departments] = await Promise.all([
    db().asset.findMany({
      where: { organizationId: user.organizationId },
      include: {
        department: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db().department.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      {canManage ? (
        <Card title="Create Asset">
          <form action={createAsset} className="grid gap-3 md:grid-cols-4">
            <input
              name="name"
              required
              placeholder="Asset name"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="type"
              required
              placeholder="Type (Road, Pump, etc.)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              name="departmentId"
              defaultValue=""
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <input
              name="status"
              defaultValue="ACTIVE"
              placeholder="Status"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="address"
              placeholder="Address (optional)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            />
            <input
              name="latitude"
              type="number"
              step="any"
              placeholder="Latitude"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="longitude"
              type="number"
              step="any"
              placeholder="Longitude"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="installDate"
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="conditionScore"
              type="number"
              min={0}
              max={100}
              placeholder="Condition score"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="md:col-span-4">
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Create Asset
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Asset Inventory">
        <div className="mb-3">
          <Link href="/dashboard/assets/map" className="text-sm text-blue-600 hover:underline">
            View Asset Map
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Asset</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Condition</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {assets.length > 0 ? (
                assets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="font-medium">{asset.name}</div>
                      <p className="text-xs text-slate-500">{asset.address ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{asset.type}</td>
                    <td className="px-4 py-3 text-slate-700">{asset.department?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{asset.conditionScore ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{asset.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    No assets found.
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
