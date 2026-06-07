export {
  archivedAtColumn,
  createdAtColumn,
  entityIdColumn,
  externalIdColumn,
  foreignEntityIdColumn,
  jsonPayloadColumn,
  standardArchiveColumn,
  standardTimestampColumns,
  updatedAtColumn,
  type EntityId,
  type JsonObject,
} from "./columns";
export {
  createStatusEnum,
} from "./enums";

/**
 * Shared conventions for application domain tables only.
 * Better Auth tables (Story 2.2.1) use the generator's own schema — do not apply these helpers there.
 *
 * Archive: set `archivedAt` and move status enum to `archived` together (see `archivedAtColumn`).
 * JSONB: suffix column names with `Json` (`definitionJson`, `inputJson`, `outputJson`, …).
 * IDs: Postgres-generated UUID primary keys; external provider IDs in separate text columns.
 */
