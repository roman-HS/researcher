import type { DomainEntityId, WorkflowId } from "@/contracts";
import type { DatabaseClient } from "@/db";
import type { IntegrationClient } from "@/integrations";
import { AUTH_MODULE_ROOT } from "@/modules/auth";
import { RUNS_MODULE_ROOT } from "@/modules/runs";
import { WORKFLOWS_MODULE_ROOT } from "@/modules/workflows";
import { WORKSPACE_MODULE_ROOT } from "@/modules/workspace";

export type AppContextPlaceholder = {
  structureVersion: 1;
  moduleRoots: {
    auth: typeof AUTH_MODULE_ROOT;
    workflows: typeof WORKFLOWS_MODULE_ROOT;
    runs: typeof RUNS_MODULE_ROOT;
    workspace: typeof WORKSPACE_MODULE_ROOT;
  };
  domainEntityId: DomainEntityId;
  workflowId: WorkflowId;
  databaseClient: DatabaseClient | null;
  integrations: IntegrationClient[];
};

export const appContextPlaceholder: AppContextPlaceholder = {
  structureVersion: 1,
  moduleRoots: {
    auth: AUTH_MODULE_ROOT,
    workflows: WORKFLOWS_MODULE_ROOT,
    runs: RUNS_MODULE_ROOT,
    workspace: WORKSPACE_MODULE_ROOT,
  },
  domainEntityId: "placeholder",
  workflowId: "placeholder",
  databaseClient: null,
  integrations: [],
};
