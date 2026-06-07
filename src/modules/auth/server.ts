import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";

import { getDb } from "@/db";
import * as authSchema from "@/db/schema/auth";
import { getServerEnv } from "@/lib/env/server";

import { betterAuthSharedOptions } from "./options";

function requireAuthSecret(): string {
  const { BETTER_AUTH_SECRET } = getServerEnv();

  if (!BETTER_AUTH_SECRET) {
    throw new Error(
      "BETTER_AUTH_SECRET is required. Add it to .env.local or set it in your deployment environment.",
    );
  }

  return BETTER_AUTH_SECRET;
}

const env = getServerEnv();

export const auth = betterAuth({
  ...betterAuthSharedOptions,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: authSchema,
  }),
  secret: requireAuthSecret(),
  baseURL: env.APP_URL,
  advanced: {
    ...betterAuthSharedOptions.advanced,
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "lax",
    },
  },
  plugins: [nextCookies()],
});
