import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/lib/env/server";

import * as schema from "./schema";

export type DatabaseClient = PostgresJsDatabase<typeof schema>;

let db: DatabaseClient | undefined;
let sql: ReturnType<typeof postgres> | undefined;

function requireDatabaseUrl(): string {
  const { DATABASE_URL } = getServerEnv();

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required for database access");
  }

  return DATABASE_URL;
}

export function getDb(): DatabaseClient {
  if (!db) {
    sql = postgres(requireDatabaseUrl(), {
      prepare: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    db = drizzle(sql, { schema });
  }

  return db;
}

export function getSql(): ReturnType<typeof postgres> {
  if (!sql) {
    getDb();
  }

  if (!sql) {
    throw new Error("Failed to initialize database connection");
  }

  return sql;
}
