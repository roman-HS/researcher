import type { BetterAuthOptions } from "better-auth";

export const betterAuthSharedOptions = {
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
} satisfies Pick<BetterAuthOptions, "emailAndPassword" | "advanced">;
