import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { tenantDb } from "@/lib/tenantDb";

export const revalidate = 300;

type CsvIssueRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  priority: string | null;
  createdAt: Date;
};

function sanitizeCsvValue(value: unknown) {
  const raw = String(value ?? "");
  const formulaUnsafe = /^[=+\-@]/.test(raw);
  const prefixed = formulaUnsafe ? `'${raw}` : raw;
  const escaped = prefixed.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

function toCsv(rows: CsvIssueRow[]) {
  const header = ["id", "title", "category", "status", "priority", "createdAt"];
  const body = rows.map((row) =>
    [
      sanitizeCsvValue(row.id),
      sanitizeCsvValue(row.title),
      sanitizeCsvValue(row.category),
      sanitizeCsvValue(row.status),
      sanitizeCsvValue(row.priority ?? ""),
      sanitizeCsvValue(row.createdAt.toISOString()),
    ].join(","),
  );

  return [header.join(","), ...body].join("\n");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const org = await getOrganizationBySlug(slug);

  const issues = await tenantDb<CsvIssueRow[]>(org.id, async (tx) => {
    return tx.issueReport.findMany({
      where: {
        organizationId: org.id,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    });
  });

  const csv = toCsv(issues);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${slug}-issues.csv"`,
    },
  });
}
