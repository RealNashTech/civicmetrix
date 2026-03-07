import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export function parsePaginationFromSearchParams(
  searchParams: URLSearchParams,
  pageKey: string,
  pageSizeKey: string,
) {
  return paginationQuerySchema.parse({
    page: searchParams.get(pageKey),
    pageSize: searchParams.get(pageSizeKey),
  });
}

