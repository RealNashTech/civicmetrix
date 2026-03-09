export type RateLimitTierName =
  | "PUBLIC_READ"
  | "PUBLIC_EXPORT"
  | "AUTHENTICATED_USER"
  | "ADMIN_ACTION"
  | "INTERNAL_SYSTEM";

export type RateLimitPolicy = {
  windowMs: number;
  maxRequests: number;
};

export const RATE_LIMIT_POLICIES: Record<RateLimitTierName, RateLimitPolicy> = {
  PUBLIC_READ: {
    windowMs: 60_000,
    maxRequests: 120,
  },
  PUBLIC_EXPORT: {
    windowMs: 60_000,
    maxRequests: 30,
  },
  AUTHENTICATED_USER: {
    windowMs: 60_000,
    maxRequests: 300,
  },
  ADMIN_ACTION: {
    windowMs: 60_000,
    maxRequests: 60,
  },
  INTERNAL_SYSTEM: {
    windowMs: 60_000,
    maxRequests: 1000,
  },
};

export const {
  PUBLIC_READ,
  PUBLIC_EXPORT,
  AUTHENTICATED_USER,
  ADMIN_ACTION,
  INTERNAL_SYSTEM,
} = RATE_LIMIT_POLICIES;
