import "server-only";

import type { ZodType } from "zod";
import { ZodError } from "zod";

import type { PaginationQuery } from "@/contracts/api/pagination";
import { isAppError } from "@/lib/api/errors";
import { parsePaginationQuery } from "@/lib/api/pagination";
import {
  apiErrorResponse,
  apiSuccessResponse,
  apiValidationErrorResponse,
} from "@/lib/api/responses";
import { isUnauthorizedError } from "@/modules/auth/errors";
import { requireUser, type CurrentUser } from "@/modules/auth/session";
import {
  isWorkflowDefinitionValidationError,
  isWorkflowLifecycleError,
} from "@/modules/workflows/errors";
import {
  isForbiddenError,
  requireWorkspaceMember,
  requireWorkspaceOwner,
  type WorkspaceAuthorizationContext,
} from "@/modules/workspace";

export type ApiRouteAuth = "none" | "user" | "workspace" | "workspace-owner";

export type RouteHandlerContext = {
  params?: Promise<Record<string, string | string[] | undefined>>;
};

type AuthContextFor<TAuth extends ApiRouteAuth> = TAuth extends "none"
  ? Record<string, never>
  : TAuth extends "user"
    ? { user: CurrentUser }
    : WorkspaceAuthorizationContext;

export type ApiRouteHandlerContext<
  TAuth extends ApiRouteAuth,
  TBody,
  TQuery,
  TParams,
  TPagination extends boolean,
> = {
  request: Request;
  params: TParams;
  body: TBody;
  query: TQuery;
  pagination: TPagination extends true ? PaginationQuery : undefined;
} & AuthContextFor<TAuth>;

export type CreateApiRouteConfig<
  TAuth extends ApiRouteAuth,
  TBody = undefined,
  TQuery = undefined,
  TParams = Record<string, string>,
  TPagination extends boolean = false,
> = {
  auth: TAuth;
  body?: ZodType<TBody>;
  query?: ZodType<TQuery>;
  params?: ZodType<TParams>;
  pagination?: TPagination;
  maxPageSize?: number;
  handler: (
    context: ApiRouteHandlerContext<TAuth, TBody, TQuery, TParams, TPagination>,
  ) => Promise<Response | unknown>;
};

const PAGINATION_QUERY_KEYS = ["page", "pageSize"] as const;

function searchParamsToRecord(
  searchParams: URLSearchParams,
  exclude: readonly string[] = [],
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    if (exclude.includes(key)) {
      continue;
    }

    if (key in result) {
      const existing = result[key];

      if (existing === undefined) {
        result[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[key] = [existing, value];
      }

      continue;
    }

    result[key] = value;
  }

  return result;
}

async function normalizeRouteParams(
  params: Promise<Record<string, string | string[] | undefined>> | undefined,
): Promise<Record<string, string>> {
  const resolved = params ? await params : {};
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(resolved)) {
    if (value === undefined) {
      continue;
    }

    normalized[key] = Array.isArray(value) ? (value[0] ?? "") : value;
  }

  return normalized;
}

async function parseRouteParams<TParams>(
  routeContext: RouteHandlerContext,
  schema?: ZodType<TParams>,
): Promise<
  { ok: true; value: TParams } | { ok: false; response: Response }
> {
  const rawParams = await normalizeRouteParams(routeContext.params);

  if (!schema) {
    return { ok: true, value: rawParams as TParams };
  }

  const result = schema.safeParse(rawParams);

  if (!result.success) {
    return { ok: false, response: apiValidationErrorResponse(result.error) };
  }

  return { ok: true, value: result.data };
}

async function parseRouteQuery<TQuery>(
  request: Request,
  schema: ZodType<TQuery> | undefined,
  pagination: boolean,
  maxPageSize?: number,
): Promise<
  | {
      ok: true;
      query: TQuery;
      pagination?: PaginationQuery;
    }
  | { ok: false; response: Response }
> {
  const searchParams = new URL(request.url).searchParams;
  let paginationValue: PaginationQuery | undefined;

  if (pagination) {
    const paginationResult = parsePaginationQuery(searchParams, { maxPageSize });

    if (!paginationResult.ok) {
      return { ok: false, response: apiValidationErrorResponse(paginationResult.error) };
    }

    paginationValue = paginationResult.value;
  }

  if (!schema) {
    return {
      ok: true,
      query: undefined as TQuery,
      pagination: paginationValue,
    };
  }

  const rawQuery = searchParamsToRecord(
    searchParams,
    pagination ? PAGINATION_QUERY_KEYS : [],
  );
  const result = schema.safeParse(rawQuery);

  if (!result.success) {
    return { ok: false, response: apiValidationErrorResponse(result.error) };
  }

  return {
    ok: true,
    query: result.data,
    pagination: paginationValue,
  };
}

async function parseRouteBody<TBody>(
  request: Request,
  schema?: ZodType<TBody>,
): Promise<
  { ok: true; value: TBody } | { ok: false; response: Response }
> {
  if (!schema) {
    return { ok: true, value: undefined as TBody };
  }

  const rawBody = await request.text();

  if (!rawBody.trim()) {
    const result = schema.safeParse({});

    if (!result.success) {
      return { ok: false, response: apiValidationErrorResponse(result.error) };
    }

    return { ok: true, value: result.data };
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return {
      ok: false,
      response: apiErrorResponse("validation_error", "Validation failed", {
        details: {
          issues: [{ path: "body", message: "Invalid JSON body" }],
        },
      }),
    };
  }

  const result = schema.safeParse(parsedBody);

  if (!result.success) {
    return { ok: false, response: apiValidationErrorResponse(result.error) };
  }

  return { ok: true, value: result.data };
}

async function resolveAuthContext<TAuth extends ApiRouteAuth>(
  auth: TAuth,
): Promise<AuthContextFor<TAuth>> {
  switch (auth) {
    case "none":
      return {} as AuthContextFor<TAuth>;
    case "user":
      return { user: await requireUser() } as AuthContextFor<TAuth>;
    case "workspace":
      return (await requireWorkspaceMember()) as AuthContextFor<TAuth>;
    case "workspace-owner":
      return (await requireWorkspaceOwner()) as AuthContextFor<TAuth>;
  }
}

function mapThrownError(error: unknown): Response {
  if (isUnauthorizedError(error)) {
    return apiErrorResponse("unauthorised", error.message);
  }

  if (isForbiddenError(error)) {
    return apiErrorResponse("forbidden", error.message);
  }

  if (isAppError(error)) {
    return apiErrorResponse(error.code, error.message, {
      details: error.details,
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }

  if (isWorkflowLifecycleError(error)) {
    return apiErrorResponse("conflict", error.message, {
      details: { code: error.code },
    });
  }

  if (isWorkflowDefinitionValidationError(error)) {
    return apiErrorResponse("invalid_workflow_definition", error.message, {
      details: {
        errors: [...error.errors],
        warnings: [...error.warnings],
      },
    });
  }

  if (error instanceof ZodError) {
    return apiValidationErrorResponse(error);
  }

  console.error("[api] unhandled error", error);

  return apiErrorResponse("internal_error", "Internal server error");
}

export function createApiRoute<
  TAuth extends ApiRouteAuth,
  TBody = undefined,
  TQuery = undefined,
  TParams = Record<string, string>,
  const TPagination extends boolean = false,
>(
  config: CreateApiRouteConfig<TAuth, TBody, TQuery, TParams, TPagination>,
) {
  return async (
    request: Request,
    routeContext: RouteHandlerContext = {},
  ): Promise<Response> => {
    try {
      const paramsResult = await parseRouteParams(routeContext, config.params);

      if (!paramsResult.ok) {
        return paramsResult.response;
      }

      const queryResult = await parseRouteQuery(
        request,
        config.query,
        config.pagination === true,
        config.maxPageSize,
      );

      if (!queryResult.ok) {
        return queryResult.response;
      }

      const bodyResult = await parseRouteBody(request, config.body);

      if (!bodyResult.ok) {
        return bodyResult.response;
      }

      const authContext = await resolveAuthContext(config.auth);

      const handlerContext = {
        request,
        params: paramsResult.value,
        body: bodyResult.value,
        query: queryResult.query,
        pagination: queryResult.pagination,
        ...authContext,
      } as ApiRouteHandlerContext<TAuth, TBody, TQuery, TParams, TPagination>;

      const result = await config.handler(handlerContext);

      if (result instanceof Response) {
        return result;
      }

      return apiSuccessResponse(result);
    } catch (error) {
      return mapThrownError(error);
    }
  };
}
