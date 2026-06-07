import "server-only";

import { cache } from "react";

import { requireUser } from "@/modules/auth/session";

import {
  ensurePersonalWorkspace,
  type CurrentWorkspace,
} from "./provision";

export type { CurrentWorkspace };

export const requireCurrentWorkspace = cache(
  async (): Promise<CurrentWorkspace> => {
    const user = await requireUser();
    return ensurePersonalWorkspace(user.id);
  },
);
