import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { getDb } from "@/db";
import * as authSchema from "@/db/schema/auth";
import { getServerEnv } from "@/lib/env/server";

import { betterAuthSharedOptions } from "./options";

function requireAuthSecret(): string {
  const { BETTER_AUTH_SECRET } = getServerEnv();

  if (BETTER_AUTH_SECRET) {
    return BETTER_AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }

  return "dev-only-better-auth-secret-min-32-chars!!";
}

export const auth = betterAuth({
  ...betterAuthSharedOptions,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: authSchema,
  }),
  secret: requireAuthSecret(),
  baseURL: getServerEnv().APP_URL,
});
