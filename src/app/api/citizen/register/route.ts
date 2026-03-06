import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { dbSystem } from "@/lib/db";
import { withApiObservability } from "@/lib/observability/http";
import { AuthorizationError } from "@/lib/policies/base";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const citizenRegisterSchema = z.object({
  name: z.string().min(2).optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(8),
  organizationSlug: z.string().min(2),
});

async function handlePost(request: Request) {
  try {
    await enforceRateLimit("auth/register", request);

    const body = await request.json();
    const parsed = citizenRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid registration input." }, { status: 400 });
    }

    const { name, email, password, organizationSlug } = parsed.data;
    const normalizedSlug = organizationSlug.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const organization = await dbSystem().organization.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const existing = await dbSystem().citizen.findFirst({
      where: {
        organizationId: organization.id,
        email: normalizedEmail,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "Citizen account already exists for this email." }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    await dbSystem().citizen.create({
      data: {
        name: name?.trim() || null,
        email: normalizedEmail,
        passwordHash,
        organizationId: organization.id,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}

export const POST = withApiObservability("/api/citizen/register", "POST", handlePost);
