import { pgEnum } from "drizzle-orm/pg-core";

type NonEmptyStringTuple = readonly [string, ...string[]];

/**
 * Creates a Postgres enum for domain table status fields.
 * Define concrete values in the owning story (e.g. 4.1.3 workflows, 7.2.2 runs).
 */
export function createStatusEnum<T extends NonEmptyStringTuple>(
  enumName: string,
  values: T,
) {
  return pgEnum(enumName, values);
}
