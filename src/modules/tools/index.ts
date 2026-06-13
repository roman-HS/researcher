export { ToolNotFoundError, isToolNotFoundError } from "@/modules/tools/errors";
export {
  listToolsForDiscovery,
  type ListToolsForDiscoveryOptions,
} from "@/modules/tools/discovery";
export {
  V1_TOOL_KEYS,
  V1_TOOLS,
  getDefaultToolConfig,
  getToolDefinition,
  getToolManifest,
  hasToolKey,
  listToolDefinitions,
  listToolDefinitionsByCategory,
} from "@/modules/tools/registry";

export const TOOLS_MODULE_ROOT = "tools" as const;
