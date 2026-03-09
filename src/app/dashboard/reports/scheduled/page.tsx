import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { requireOrganization } from "@/lib/auth/require-org";
import { tenantDb } from "@/lib/tenantDb";

const REPORT_TYPES = [
  "Weekly Operations Report",
  "Monthly Infrastructure Health Report",
  "Quarterly Council Briefing",
] as const;

const FREQUENCIES = ["weekly", "monthly", "quarterly"] as const;

function nextRunFromFrequency(frequency: string, from = new Date()): Date {
  const next = new Date(from);
  if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  if (frequency === "quarterly") {
    next.setMonth(next.getMonth() + 3);
    return next;
  }
  next.setDate(next.getDate() + 7);
  return next;
}

async function createScheduledReport(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const organizationId = requireOrganization(session);
  const reportType = String(formData.get("reportType") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const emailRecipients = String(formData.get("emailRecipients") ?? "").trim();

  if (!REPORT_TYPES.includes(reportType as (typeof REPORT_TYPES)[number])) {
    redirect("/dashboard/reports/scheduled?error=Invalid%20report%20type");
  }
  if (!FREQUENCIES.includes(frequency as (typeof FREQUENCIES)[number])) {
    redirect("/dashboard/reports/scheduled?error=Invalid%20frequency");
  }
  if (!emailRecipients) {
    redirect("/dashboard/reports/scheduled?error=Email%20recipients%20required");
  }

  await tenantDb(organizationId, async (tx) => {
    await tx.scheduledReport.create({
      data: {
        organizationId,
        reportType,
        frequency,
        emailRecipients,
        nextRunAt: nextRunFromFrequency(frequency),
      },
    });
  });

  revalidatePath("/dashboard/reports/scheduled");
  redirect("/dashboard/reports/scheduled");
}

async function editScheduledReport(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const organizationId = requireOrganization(session);
  const id = String(formData.get("id") ?? "").trim();
  const reportType = String(formData.get("reportType") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const emailRecipients = String(formData.get("emailRecipients") ?? "").trim();

  if (!id) {
    redirect("/dashboard/reports/scheduled?error=Missing%20id");
  }

  if (!REPORT_TYPES.includes(reportType as (typeof REPORT_TYPES)[number])) {
    redirect("/dashboard/reports/scheduled?error=Invalid%20report%20type");
  }
  if (!FREQUENCIES.includes(frequency as (typeof FREQUENCIES)[number])) {
    redirect("/dashboard/reports/scheduled?error=Invalid%20frequency");
  }

  await tenantDb(organizationId, async (tx) => {
    const existing = await tx.scheduledReport.findFirst({
      where: {
        id,
        organizationId,
      },
      select: {
        id: true,
        lastRunAt: true,
      },
    });

    if (!existing) {
      throw new Error("Scheduled report not found");
    }

    await tx.scheduledReport.update({
      where: { id: existing.id },
      data: {
        reportType,
        frequency,
        emailRecipients,
        nextRunAt: existing.lastRunAt ? nextRunFromFrequency(frequency, existing.lastRunAt) : nextRunFromFrequency(frequency),
      },
    });
  });

  revalidatePath("/dashboard/reports/scheduled");
  redirect("/dashboard/reports/scheduled");
}

async function deleteScheduledReport(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const organizationId = requireOrganization(session);
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/dashboard/reports/scheduled?error=Missing%20id");
  }

  await tenantDb(organizationId, async (tx) => {
    await tx.scheduledReport.deleteMany({
      where: {
        id,
        organizationId,
      },
    });
  });

  revalidatePath("/dashboard/reports/scheduled");
  redirect("/dashboard/reports/scheduled");
}

export default async function ScheduledReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const organizationId = requireOrganization(session);
  const params = await searchParams;

  const scheduledReports = await tenantDb(organizationId, async (tx) => {
    return tx.scheduledReport.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  return (
    <div className="space-y-6">
      <Card title="Create Scheduled Report">
        {params.error ? (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        ) : null}
        <form action={createScheduledReport} className="grid gap-3 md:grid-cols-4">
          <select name="reportType" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required>
            {REPORT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select name="frequency" className="rounded-md border border-slate-300 px-3 py-2 text-sm" required>
            {FREQUENCIES.map((frequency) => (
              <option key={frequency} value={frequency}>
                {frequency}
              </option>
            ))}
          </select>

          <input
            name="emailRecipients"
            placeholder="city.manager@agency.gov, analyst@agency.gov"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            required
          />

          <div className="md:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create Scheduled Report
            </button>
          </div>
        </form>
      </Card>

      <Card title="Edit Scheduled Report">
        <div className="space-y-4">
          {scheduledReports.map((report: {
            id: string;
            reportType: string;
            frequency: string;
            emailRecipients: string;
            nextRunAt: Date;
            lastRunAt: Date | null;
            createdAt: Date;
          }) => (
            <form key={report.id} action={editScheduledReport} className="rounded-md border border-slate-200 p-3">
              <input type="hidden" name="id" value={report.id} />
              <div className="grid gap-3 md:grid-cols-4">
                <select
                  name="reportType"
                  defaultValue={report.reportType}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  {REPORT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <select
                  name="frequency"
                  defaultValue={report.frequency}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                >
                  {FREQUENCIES.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {frequency}
                    </option>
                  ))}
                </select>

                <input
                  name="emailRecipients"
                  defaultValue={report.emailRecipients}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                  required
                />
              </div>

              <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                <p>Last Run: {report.lastRunAt ? new Date(report.lastRunAt).toLocaleString() : "Never"}</p>
                <p>Next Run: {new Date(report.nextRunAt).toLocaleString()}</p>
                <p>Created: {new Date(report.createdAt).toLocaleString()}</p>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Save Changes
                </button>
                <button
                  formAction={deleteScheduledReport}
                  type="submit"
                  className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Delete Scheduled Report
                </button>
              </div>
            </form>
          ))}

          {scheduledReports.length === 0 ? (
            <p className="text-sm text-slate-500">No scheduled reports configured.</p>
          ) : null}
        </div>
      </Card>

      <Card title="Delete Scheduled Report">
        <p className="text-sm text-slate-600">
          Use the delete button on each record above to remove a scheduled report.
        </p>
      </Card>
    </div>
  );
}
