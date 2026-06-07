import {
  jsonb,
  text,
  timestamp,
  uuid,
  type PgTimestampBuilderInitial,
  type PgUUIDBuilderInitial,
} from "drizzle-orm/pg-core";

/** Matches `DomainEntityId` in contracts — UUID stored as string at the app boundary. */
export type EntityId = string;

export type JsonObject = Record<string, unknown>;

export function entityIdColumn(name = "id"): PgUUIDBuilderInitial<string> {
  return uuid(name).defaultRandom().primaryKey();
}

export function foreignEntityIdColumn(name: string): PgUUIDBuilderInitial<string> {
  return uuid(name).notNull();
}

/**
 * External provider identifiers (Zillow, RapidAPI, etc.).
 * Never use as primary keys — pair with `entityIdColumn()` for app-owned rows.
 */
export function externalIdColumn(name: string) {
  return text(name);
}

export function createdAtColumn(): PgTimestampBuilderInitial<"createdAt"> {
  return timestamp("createdAt", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow();
}

export function updatedAtColumn(): PgTimestampBuilderInitial<"updatedAt"> {
  return timestamp("updatedAt", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
}

/**
 * Nullable until archived. On archive, set this timestamp and move the row's
 * status enum to `archived`. Domain tables do not use `deletedAt` in V1.
 */
export function archivedAtColumn(): PgTimestampBuilderInitial<"archivedAt"> {
  return timestamp("archivedAt", { withTimezone: true, mode: "date" });
}

/**
 * JSONB payloads use an `Json` suffix (`definitionJson`, `inputJson`, …).
 * Strong validation belongs in Zod contracts; DB columns stay intentionally loose.
 */
export function jsonPayloadColumn<T extends JsonObject = JsonObject>(name: string) {
  return jsonb(name).$type<T>();
}

export const standardTimestampColumns = {
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
} as const;

export const standardArchiveColumn = {
  archivedAt: archivedAtColumn(),
} as const;
