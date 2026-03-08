import { z } from "zod";

import { dbSystem } from "@/lib/db";

const createIssueSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(3).max(180),
  description: z.string().min(10).max(4000),
  category: z.enum(["pothole", "streetlight", "garbage", "graffiti", "sidewalk"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createIssueSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: "Invalid issue report input.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { slug, title, description, category, latitude, longitude } = parsed.data;

  const organization = await dbSystem().organization.findUnique({
    where: { slug: slug.trim().toLowerCase() },
    select: { id: true },
  });

  if (!organization) {
    return Response.json({ ok: false, error: "Organization not found." }, { status: 404 });
  }

  const issue = await dbSystem().issueReport.create({
    data: {
      organizationId: organization.id,
      title: title.trim(),
      description: description.trim(),
      category,
      latitude,
      longitude,
      status: "OPEN",
    },
    select: {
      id: true,
      title: true,
      category: true,
      createdAt: true,
      status: true,
    },
  });

  return Response.json({
    ok: true,
    issue,
  });
}
