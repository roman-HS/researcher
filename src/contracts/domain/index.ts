/**
 * Provider-agnostic canonical DTOs and shared primitives.
 *
 * Import direction: `domain` may be imported by any contract folder; it must not
 * import from entity folders (`workflows`, `runs`, etc.).
 *
 * @see Naming and import rules in `src/contracts/index.ts`
 */

/** Placeholder until Story 3.2.2 defines `domainEntityIdSchema`. */
export type DomainEntityId = string;
