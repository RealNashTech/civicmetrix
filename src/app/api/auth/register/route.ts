import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthError } from "@/lib/auth/require-staff";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
  organizationSlug: z.string().min(2),
});

export async function POST(request: Request) {
  try {
    await enforceRateLimit("auth/register", request);

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid registration input." },
        { status: 400 },
      );
    }

    const { name, email, password, organizationName, organizationSlug } = parsed.data;
    const normalizedSlug = organizationSlug.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const existingOrg = await db().organization.findUnique({
      where: { slug: normalizedSlug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization slug already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 12);

    await db().$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: normalizedSlug,
        },
      });

      await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: "ADMIN",
          organizationId: organization.id,
        },
      });
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Registration failed." },
      { status: 500 },
    );
  }
}
