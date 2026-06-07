import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { betterAuthSharedOptions } from "./options";

/**
 * CLI-only auth config for schema generation (`pnpm auth:generate`).
 * Runtime wiring with a real database lives in `server.ts`.
 */
const cliDatabase = {} as Parameters<typeof drizzleAdapter>[0];

export const auth = betterAuth({
  ...betterAuthSharedOptions,
  database: drizzleAdapter(cliDatabase, {
    provider: "pg",
  }),
  secret: "cli-schema-generation-secret-min-32-chars",
  baseURL: "http://localhost:3000",
});
