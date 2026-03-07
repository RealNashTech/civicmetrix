import { hash } from "bcryptjs";
import { z } from "zod";

import { apiError } from "@/lib/api/error-response";
import { apiSuccess } from "@/lib/api/success-response";
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
      return apiError("Invalid registration input.", 400);
    }

    const { name, email, password, organizationSlug } = parsed.data;
    const normalizedSlug = organizationSlug.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const organization = await dbSystem().organization.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true },
    });

    if (!organization) {
      return apiError("Organization not found.", 404);
    }

    const existing = await dbSystem().citizen.findFirst({
      where: {
        organizationId: organization.id,
        email: normalizedEmail,
      },
      select: { id: true },
    });

    if (existing) {
      return apiError("Citizen account already exists for this email.", 409);
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

    return apiSuccess({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError(error.message, error.status);
    }

    return apiError("Registration failed.", 500);
  }
}

export const POST = withApiObservability("/api/citizen/register", "POST", handlePost);
