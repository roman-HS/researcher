export const WORKSPACE_MODULE_ROOT = "workspace" as const;

export { PERSONAL_WORKSPACE_NAME } from "./constants";
export {
  requireWorkspaceMember,
  requireWorkspaceOwner,
} from "./authorization";
export type {
  WorkspaceAuthorizationContext,
  WorkspaceMembership,
} from "./authorization";
export { requireCurrentWorkspace } from "./context";
export type { CurrentWorkspace } from "./context";
export {
  ForbiddenError,
  forbiddenResponse,
  isForbiddenError,
} from "./errors";
export { ensurePersonalWorkspace } from "./provision";
export {
  assertRunInWorkspace,
  assertWorkflowInWorkspace,
} from "./scope";
export type {
  WorkspaceScopedResource,
  WorkspaceScopedRun,
  WorkspaceScopedWorkflow,
} from "./scope";
