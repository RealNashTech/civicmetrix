import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { tenantDb } from "@/lib/tenantDb";

export const revalidate = 300;

type CsvKpiRow = {
  id: string;
  name: string;
  value: number;
  unit: string | null;
  periodLabel: string | null;
  createdAt: Date;
};

function sanitizeCsvValue(value: unknown) {
  const raw = String(value ?? "");
  const formulaUnsafe = /^[=+\-@]/.test(raw);
  const prefixed = formulaUnsafe ? `'${raw}` : raw;
  const escaped = prefixed.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

function toCsv(rows: CsvKpiRow[]) {
  const header = ["id", "name", "value", "unit", "periodLabel", "createdAt"];
  const body = rows.map((row) =>
    [
      sanitizeCsvValue(row.id),
      sanitizeCsvValue(row.name),
      sanitizeCsvValue(row.value),
      sanitizeCsvValue(row.unit ?? ""),
      sanitizeCsvValue(row.periodLabel ?? ""),
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

  const kpis = await tenantDb<CsvKpiRow[]>(org.id, async (tx) => {
    return tx.kPI.findMany({
      where: {
        organizationId: org.id,
        isPublic: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        value: true,
        unit: true,
        periodLabel: true,
        createdAt: true,
      },
    });
  });

  const csv = toCsv(kpis);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${slug}-kpis.csv"`,
    },
  });
}
