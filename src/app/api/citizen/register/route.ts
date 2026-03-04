import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError } from "@/lib/auth/require-staff";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const citizenRegisterSchema = z.object({
  name: z.string().min(2).optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(8),
  organizationSlug: z.string().min(2),
});

export async function POST(request: Request) {
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

    const organization = await db().organization.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const existing = await db().citizen.findFirst({
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

    await db().citizen.create({
      data: {
        name: name?.trim() || null,
        email: normalizedEmail,
        passwordHash,
        organizationId: organization.id,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
