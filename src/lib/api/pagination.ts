import type { ZodError } from "zod";

import {
  createPaginationQuerySchema,
  type ApiListMeta,
  type ApiPaginationMeta,
  type PaginationQuery,
} from "@/contracts/api/pagination";
import { apiSuccessResponse } from "@/lib/api/responses";

export type ParsePaginationQueryOptions = {
  maxPageSize?: number;
};

export type ParsePaginationQueryResult =
  | { ok: true; value: PaginationQuery }
  | { ok: false; error: ZodError };

function getOptionalQueryValue(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key);

  if (value === null || value === "") {
    return undefined;
  }

  return value;
}

export function parsePaginationQuery(
  searchParams: URLSearchParams,
  options: ParsePaginationQueryOptions = {},
): ParsePaginationQueryResult {
  const page = getOptionalQueryValue(searchParams, "page");
  const pageSize = getOptionalQueryValue(searchParams, "pageSize");
  const schema = createPaginationQuerySchema(options.maxPageSize);
  const result = schema.safeParse({
    ...(page !== undefined && { page }),
    ...(pageSize !== undefined && { pageSize }),
  });

  if (!result.success) {
    return { ok: false, error: result.error };
  }

  return { ok: true, value: result.data };
}

export function buildPaginationMeta(
  query: PaginationQuery,
  totalCount: number,
): ApiPaginationMeta {
  const totalPages =
    totalCount === 0 ? 0 : Math.ceil(totalCount / query.pageSize);

  return {
    page: query.page,
    pageSize: query.pageSize,
    totalCount,
    totalPages,
    hasNextPage: totalPages > 0 && query.page < totalPages,
    hasPreviousPage: query.page > 1,
  };
}

export function toOffsetLimit(query: PaginationQuery): {
  offset: number;
  limit: number;
} {
  return {
    offset: (query.page - 1) * query.pageSize,
    limit: query.pageSize,
  };
}

export function apiPaginatedSuccessResponse<T>(
  items: T[],
  pagination: ApiPaginationMeta,
  options: { status?: number } = {},
): Response {
  const meta: ApiListMeta = { pagination };

  return apiSuccessResponse(items, {
    status: options.status,
    meta,
  });
}
