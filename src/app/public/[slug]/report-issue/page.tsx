import Link from "next/link";

import { db } from "@/lib/db";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";

import { createIssueReport } from "./actions";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ReportIssuePage({ params }: Props) {
  const resolvedParams = await params;
  const organization = await getOrganizationBySlug(resolvedParams.slug);

  const [departments, assets] = await Promise.all([
    db().department.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db().asset.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <Link
          href={`/public/${resolvedParams.slug}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Public Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Report an Issue</h1>
        <p className="text-sm text-slate-600">
          Submit a civic issue for {organization.name}. City staff will review and triage it.
        </p>
        <p className="text-sm text-slate-600">
          Have an account?{" "}
          <Link href="/citizen/login" className="text-blue-600 hover:underline">
            Citizen login
          </Link>{" "}
          or{" "}
          <Link href="/citizen/register" className="text-blue-600 hover:underline">
            register
          </Link>
          .
        </p>
      </div>

      <form
        action={async (formData) => {
          "use server";
          await createIssueReport({ slug: resolvedParams.slug, formData });
        }}
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-6"
      >
        <input
          name="reporterName"
          placeholder="Name"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="reporterEmail"
          type="email"
          placeholder="Email"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="title"
          required
          placeholder="Issue Title"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <textarea
          name="description"
          required
          placeholder="Description"
          className="min-h-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="category"
          required
          placeholder="Category"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="address"
          placeholder="Address (optional)"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="latitude"
          type="number"
          step="any"
          placeholder="Latitude (optional)"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          name="longitude"
          type="number"
          step="any"
          placeholder="Longitude (optional)"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="assetId"
          defaultValue=""
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Asset (optional)</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} ({asset.type})
            </option>
          ))}
        </select>
        <select
          name="departmentId"
          defaultValue=""
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Department (optional)</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <input
          name="photo"
          type="file"
          accept="image/*"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Submit Issue
        </button>
      </form>
    </div>
  );
}
