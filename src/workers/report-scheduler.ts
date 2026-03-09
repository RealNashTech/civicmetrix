import { dbSystem } from "@/lib/db";
import { logger } from "@/lib/observability/logger";
import { recordSystemMetric } from "@/lib/system-metrics";
import { tenantDb } from "@/lib/tenantDb";

function nextRunAt(frequency: string, from: Date): Date {
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

function asCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function buildReportHtml(args: {
  reportType: string;
  organizationId: string;
  generatedAt: Date;
  totalAssets: number;
  assetsAtRisk: number;
  totalOpenIssues: number;
  totalWorkOrders: number;
  openWorkOrders: number;
  inProgressWorkOrders: number;
  completedWorkOrders: number;
  kpisBelowTarget: number;
  grantTotalsByDepartment: Array<{ department: string; totalAmount: number }>;
  issuesByCategory: Array<{ category: string; count: number }>;
}): string {
  const issuesMarkup = args.issuesByCategory
    .map((item) => `<li>${item.category}: ${item.count}</li>`)
    .join("");
  const grantMarkup = args.grantTotalsByDepartment
    .map((item) => `<li>${item.department}: ${asCurrency(item.totalAmount)}</li>`)
    .join("");

  return `
    <h1>${args.reportType}</h1>
    <p>Organization: ${args.organizationId}</p>
    <p>Generated: ${args.generatedAt.toISOString()}</p>
    <h2>Infrastructure Health Summary</h2>
    <p>Total Assets: ${args.totalAssets}</p>
    <p>Assets at Risk: ${args.assetsAtRisk}</p>
    <h2>Open Issues by Category</h2>
    <p>Total Open Issues: ${args.totalOpenIssues}</p>
    <ul>${issuesMarkup || "<li>No open issues</li>"}</ul>
    <h2>Work Order Status Summary</h2>
    <p>Total Work Orders: ${args.totalWorkOrders}</p>
    <p>Open: ${args.openWorkOrders}</p>
    <p>In Progress: ${args.inProgressWorkOrders}</p>
    <p>Completed: ${args.completedWorkOrders}</p>
    <h2>Grant Funding Overview</h2>
    <ul>${grantMarkup || "<li>No grants</li>"}</ul>
    <h2>KPI Performance Summary</h2>
    <p>KPIs Below Target: ${args.kpisBelowTarget}</p>
  `;
}

export async function runReportSchedulerWorker() {
  const now = new Date();

  const organizations = await dbSystem().organization.findMany({
    select: { id: true },
  });

  for (const organization of organizations) {
    const startedAt = Date.now();
    try {
      await tenantDb(organization.id, async (tx) => {
        const schedules = await tx.scheduledReport.findMany({
          where: {
            organizationId: organization.id,
            nextRunAt: {
              lte: now,
            },
          },
        });

        for (const schedule of schedules as Array<{
        id: string;
        organizationId: string;
        reportType: string;
        frequency: string;
        emailRecipients: string;
        }>) {
          const [
            totalAssets,
            assetsAtRisk,
            totalOpenIssues,
            issuesByCategoryRaw,
            totalWorkOrders,
            workOrdersByStatusRaw,
            grantsByDepartmentRaw,
            departments,
            kpis,
          ] = await Promise.all([
            tx.asset.count({ where: { organizationId: organization.id } }),
            tx.asset.count({
              where: { organizationId: organization.id, conditionScore: { lt: 40 } },
            }),
            tx.issueReport.count({ where: { organizationId: organization.id, status: "OPEN" } }),
            tx.issueReport.groupBy({
              by: ["category"],
              where: { organizationId: organization.id, status: "OPEN" },
              _count: { _all: true },
            }),
            tx.workOrder.count({ where: { organizationId: organization.id } }),
            tx.workOrder.groupBy({
              by: ["status"],
              where: { organizationId: organization.id },
              _count: { _all: true },
            }),
            tx.grant.groupBy({
              by: ["departmentId"],
              where: { organizationId: organization.id },
              _sum: { amount: true },
            }),
            tx.department.findMany({
              where: { organizationId: organization.id },
              select: { id: true, name: true },
            }),
            tx.kPI.findMany({
              where: {
                organizationId: organization.id,
                target: { not: null },
              },
              select: { value: true, target: true },
            }),
          ]);

          const deptMap = new Map(
            departments.map((department: { id: string; name: string }) => [department.id, department.name]),
          );

          const issuesByCategory = issuesByCategoryRaw.map(
            (row: { category: string; _count: { _all: number } }) => ({
              category: row.category,
              count: row._count._all,
            }),
          );

          const openWorkOrders =
            workOrdersByStatusRaw.find((row: { status: string }) => row.status === "OPEN")?._count._all ?? 0;
          const inProgressWorkOrders =
            workOrdersByStatusRaw.find((row: { status: string }) => row.status === "IN_PROGRESS")?._count._all ?? 0;
          const completedWorkOrders =
            workOrdersByStatusRaw.find((row: { status: string }) => row.status === "COMPLETE")?._count._all ?? 0;

          const grantTotalsByDepartment = grantsByDepartmentRaw
            .map((row: { departmentId: string | null; _sum: { amount: unknown } }) => ({
              department: row.departmentId ? deptMap.get(row.departmentId) ?? "Unknown Department" : "Unassigned",
              totalAmount: Number(row._sum.amount ?? 0),
            }))
            .sort((a: { totalAmount: number }, b: { totalAmount: number }) => b.totalAmount - a.totalAmount);

          const kpisBelowTarget = kpis.filter(
            (kpi: { value: number; target: number | null }) =>
              typeof kpi.target === "number" && kpi.value < kpi.target,
          ).length;

          const htmlReport = buildReportHtml({
            reportType: schedule.reportType,
            organizationId: schedule.organizationId,
            generatedAt: now,
            totalAssets,
            assetsAtRisk,
            totalOpenIssues,
            totalWorkOrders,
            openWorkOrders,
            inProgressWorkOrders,
            completedWorkOrders,
            kpisBelowTarget,
            grantTotalsByDepartment,
            issuesByCategory,
          });

          const recipients = schedule.emailRecipients
            .split(",")
            .map((entry) => entry.trim().toLowerCase())
            .filter(Boolean);

          const users = recipients.length
            ? await tx.user.findMany({
                where: {
                  organizationId: organization.id,
                  email: { in: recipients },
                },
                select: { id: true },
              })
            : [];

          if (users.length > 0) {
            await tx.notification.createMany({
              data: users.map((user: { id: string }) => ({
                userId: user.id,
                message: `${schedule.reportType} generated and sent to ${schedule.emailRecipients}.`,
                link: "/dashboard/reports",
              })),
            });
          }

          await tx.event.create({
            data: {
              organizationId: organization.id,
              type: "SCHEDULED_REPORT_EMAIL_SENT",
              entityType: "SCHEDULED_REPORT",
              entityId: schedule.id,
              payload: {
                reportType: schedule.reportType,
                recipients,
                htmlReport,
              },
              processed: true,
              processedAt: now,
            },
          });

          await tx.scheduledReport.update({
            where: { id: schedule.id },
            data: {
              lastRunAt: now,
              nextRunAt: nextRunAt(schedule.frequency, now),
            },
          });

          logger.info("scheduled_report_processed", {
            organizationId: organization.id,
            scheduledReportId: schedule.id,
            reportType: schedule.reportType,
            recipientCount: recipients.length,
          });
        }
      });
      await recordSystemMetric(
        organization.id,
        "WORKER_RUNTIME:report-scheduler-worker",
        Date.now() - startedAt,
      );
    } catch {
      await recordSystemMetric(organization.id, "ERROR_RATE:report-scheduler-worker", 1, "CRITICAL");
      throw new Error(`Report scheduler worker failed for organization ${organization.id}`);
    }
  }
}
