/**
 * Server-side tool executor registry.
 *
 * Import from this module in runtime/dispatch code only — not exported from
 * `@/modules/tools` to keep execution wiring out of UI bundles.
 *
 * @see Story 6.2.3 — Add executor registry
 */

export {
  ExecutorNotFoundError,
  isExecutorNotFoundError,
} from "@/modules/tools/executors/errors";
export {
  EXECUTOR_NOT_IMPLEMENTED_CODE,
  createNotImplementedToolExecutor,
} from "@/modules/tools/executors/not-implemented";
export {
  V1_EXECUTOR_KEYS,
  getExecutor,
  hasExecutor,
  listExecutorKeys,
} from "@/modules/tools/executors/registry";
