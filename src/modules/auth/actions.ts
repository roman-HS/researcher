"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/modules/auth/server";
import {
  formatAuthFieldErrors,
  signInSchema,
  signUpSchema,
} from "@/modules/auth/schemas";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const SIGN_IN_FAILURE_MESSAGE = "Invalid email or password.";
const SIGN_UP_FAILURE_MESSAGE = "Could not create account.";

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: formatAuthFieldErrors(parsed.error) };
  }

  try {
    await auth.api.signInEmail({
      body: parsed.data,
      headers: await headers(),
    });
  } catch {
    return { error: SIGN_IN_FAILURE_MESSAGE };
  }

  redirect("/workflows");
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: formatAuthFieldErrors(parsed.error) };
  }

  try {
    await auth.api.signUpEmail({
      body: parsed.data,
      headers: await headers(),
    });
  } catch {
    return { error: SIGN_UP_FAILURE_MESSAGE };
  }

  redirect("/workflows");
}

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect("/sign-in");
}
