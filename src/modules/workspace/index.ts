export const WORKSPACE_MODULE_ROOT = "workspace" as const;

export { PERSONAL_WORKSPACE_NAME } from "./constants";
export { requireCurrentWorkspace } from "./context";
export type { CurrentWorkspace } from "./context";
export { ensurePersonalWorkspace } from "./provision";
