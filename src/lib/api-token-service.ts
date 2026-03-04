import { randomBytes } from "crypto";

import { compare, hash } from "bcryptjs";

import { db } from "@/lib/db";

const API_TOKEN_RANDOM_BYTES = 48;
const API_TOKEN_HASH_ROUNDS = 12;

type CreateApiTokenInput = {
  organizationId: string;
  name: string;
  scope: string;
  expiresAt?: Date | null;
};

type SafeApiTokenRecord = {
  id: string;
  organizationId: string;
  name: string;
  scope: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
};

export function generateApiToken() {
  return randomBytes(API_TOKEN_RANDOM_BYTES).toString("base64url");
}

export async function createApiToken({
  organizationId,
  name,
  scope,
  expiresAt,
}: CreateApiTokenInput): Promise<{ token: string; record: SafeApiTokenRecord }> {
  const token = generateApiToken();
  const tokenPrefix = token.slice(0, 8);
  const tokenHash = await hash(token, API_TOKEN_HASH_ROUNDS);

  const created = await db().apiToken.create({
    data: {
      organizationId,
      name,
      tokenPrefix,
      scope,
      expiresAt: expiresAt ?? null,
      tokenHash,
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      scope: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
      revokedAt: true,
    },
  });

  return {
    token,
    record: created,
  };
}

export async function validateApiToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const tokenPrefix = token.slice(0, 8);
  const now = new Date();
  const candidates = await db().apiToken.findMany({
    where: {
      tokenPrefix,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      scope: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
      revokedAt: true,
      tokenHash: true,
    },
  });

  for (const candidate of candidates) {
    const isMatch = await compare(token, candidate.tokenHash);

    if (!isMatch) {
      continue;
    }

    const updated = await db().apiToken.update({
      where: { id: candidate.id },
      data: { lastUsedAt: now },
      select: {
        id: true,
        organizationId: true,
        name: true,
        scope: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        revokedAt: true,
      },
    });

    return updated;
  }

  return null;
}
