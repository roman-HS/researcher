/** Stub for Turbopack — this app uses the Drizzle adapter only. */
export function getKyselyDatabaseType() {
  return null;
}

export async function createKyselyAdapter() {
  return {
    kysely: null,
    databaseType: null,
    transaction: undefined,
  };
}

export function kyselyAdapter() {
  throw new Error("Kysely adapter is not used in this project.");
}
