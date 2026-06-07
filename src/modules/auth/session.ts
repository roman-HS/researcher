import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { apiErrorResponse } from "@/lib/api/responses";
import { UnauthorizedError } from "@/modules/auth/errors";
import { auth } from "@/modules/auth/server";

export type CurrentSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export type CurrentUser = CurrentSession["user"];

export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session ?? null;
});

export async function requireUser(): Promise<CurrentUser> {
  const session = await getCurrentSession();

  if (!session) {
    throw new UnauthorizedError();
  }

  return session.user;
}

export function unauthorizedResponse(): Response {
  return apiErrorResponse("unauthorised", "Unauthorised");
}

export function formatUserLabel(user: CurrentUser): string {
  const name = user.name?.trim();

  return name || user.email;
}
