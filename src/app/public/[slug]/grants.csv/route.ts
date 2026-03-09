import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug";
import { tenantDb } from "@/lib/tenantDb";

export const revalidate = 300;

type CsvGrantRow = {
  id: string;
  name: string;
  amount: unknown;
  createdAt: Date;
};

function sanitizeCsvValue(value: unknown) {
  const raw = String(value ?? "");
  const formulaUnsafe = /^[=+\-@]/.test(raw);
  const prefixed = formulaUnsafe ? `'${raw}` : raw;
  const escaped = prefixed.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

function toCsv(rows: CsvGrantRow[]) {
  const header = ["id", "name", "amount", "createdAt"];
  const body = rows.map((row) =>
    [
      sanitizeCsvValue(row.id),
      sanitizeCsvValue(row.name),
      sanitizeCsvValue(row.amount ?? ""),
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

  const grants = await tenantDb<CsvGrantRow[]>(org.id, async (tx) => {
    return tx.grant.findMany({
      where: {
        organizationId: org.id,
        isPublic: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        amount: true,
        createdAt: true,
      },
    });
  });

  const csv = toCsv(grants);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${slug}-grants.csv"`,
    },
  });
}
