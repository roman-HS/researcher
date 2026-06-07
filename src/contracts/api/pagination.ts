import { z } from "zod";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function createPaginationQuerySchema(maxPageSize = MAX_PAGE_SIZE) {
  return z.object({
    page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(maxPageSize)
      .default(DEFAULT_PAGE_SIZE),
  });
}

export const paginationQuerySchema = createPaginationQuerySchema();

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const apiPaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export type ApiPaginationMeta = z.infer<typeof apiPaginationMetaSchema>;

export const apiListMetaSchema = z.object({
  pagination: apiPaginationMetaSchema,
});

export type ApiListMeta = z.infer<typeof apiListMetaSchema>;
