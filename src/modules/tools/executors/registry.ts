import { listingSearchToolKey } from "@/contracts/providers/zillow/listing-search";
import type { ToolExecutor } from "@/contracts/runs";
import type { ToolKey } from "@/contracts/tools";
import { ExecutorNotFoundError } from "@/modules/tools/executors/errors";
import { executeListingSearch } from "@/modules/tools/executors/listing-search";
import { createNotImplementedToolExecutor } from "@/modules/tools/executors/not-implemented";
import { V1_TOOL_KEYS, V1_TOOLS } from "@/modules/tools/registry";

type ExecutorRegistration = {
  toolKey: ToolKey;
  execute: ToolExecutor;
};

function buildExecutorRegistry(registrations: readonly ExecutorRegistration[]) {
  const keys = registrations.map((registration) => registration.toolKey);
  const duplicateKeys = keys.filter(
    (key, index) => keys.indexOf(key) !== index,
  );

  if (duplicateKeys.length > 0) {
    throw new Error(
      `Duplicate executor tool keys in registry: ${[...new Set(duplicateKeys)].join(", ")}`,
    );
  }

  const registeredKeys = new Set(keys);
  const missingToolKeys = V1_TOOL_KEYS.filter((key) => !registeredKeys.has(key));

  if (missingToolKeys.length > 0) {
    throw new Error(
      `Missing executor registrations for V1 tools: ${missingToolKeys.join(", ")}`,
    );
  }

  const orphanKeys = keys.filter((key) => !V1_TOOL_KEYS.includes(key));

  if (orphanKeys.length > 0) {
    throw new Error(
      `Executor registry contains keys not present in V1 tools: ${orphanKeys.join(", ")}`,
    );
  }

  const executorsByKey = new Map<ToolKey, ToolExecutor>(
    registrations.map((registration) => [
      registration.toolKey,
      registration.execute,
    ]),
  );

  return {
    executorKeys: keys,
    executorsByKey,
  };
}

const rawV1Executors: ExecutorRegistration[] = V1_TOOLS.map((tool) => ({
  toolKey: tool.key,
  execute:
    tool.key === listingSearchToolKey
      ? executeListingSearch
      : createNotImplementedToolExecutor(tool.key),
}));

const registry = buildExecutorRegistry(rawV1Executors);

export const V1_EXECUTOR_KEYS = registry.executorKeys;

export function listExecutorKeys(): readonly ToolKey[] {
  return V1_EXECUTOR_KEYS;
}

export function hasExecutor(toolKey: ToolKey | string): toolKey is ToolKey {
  return registry.executorsByKey.has(toolKey as ToolKey);
}

export function getExecutor(toolKey: ToolKey | string): ToolExecutor {
  const executor = registry.executorsByKey.get(toolKey as ToolKey);

  if (!executor) {
    throw new ExecutorNotFoundError(toolKey);
  }

  return executor;
}
