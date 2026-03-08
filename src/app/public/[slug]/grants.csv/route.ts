import { dbSystem } from "@/lib/db";
import { getOrganizationBySlug } from "@/lib/public/getOrganizationBySlug"

type CsvGrantRow = {
  id: string
  name: string
  amount: unknown
  createdAt: Date
}

function sanitizeCsvValue(value: unknown) {
  const raw = String(value ?? "")
  const formulaUnsafe = /^[=+\-@]/.test(raw)
  const prefixed = formulaUnsafe ? `'${raw}` : raw
  const escaped = prefixed.replace(/"/g, "\"\"")
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped
}

function toCsv(rows: CsvGrantRow[]) {

  const header = [
    "id",
    "name",
    "amount",
    "createdAt"
  ]

  const body = rows.map(row =>
    [
      sanitizeCsvValue(row.id),
      sanitizeCsvValue(row.name),
      sanitizeCsvValue(row.amount ?? ""),
      sanitizeCsvValue(row.createdAt.toISOString())
    ].join(",")
  )

  return [header.join(","), ...body].join("\n")
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = await params

  const org = await getOrganizationBySlug(resolvedParams.slug)

  const grants = await dbSystem().grant.findMany({
    where: {
      organizationId: org.id,
      isPublic: true
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      name: true,
      amount: true,
      createdAt: true
    }
  })

  const csv = toCsv(grants)

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${resolvedParams.slug}-grants.csv"`
    }
  })
}
