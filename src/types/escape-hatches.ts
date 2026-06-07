/**
 * Intentional escape hatch for rare cases where `any` is unavoidable
 * (e.g. third-party gaps). Prefer `unknown` and narrowing instead.
 * Project-wide ESLint `no-explicit-any` enforcement arrives in Story 1.1.8.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- sole documented any escape hatch */
export type UnsafeAny = any;
/* eslint-enable @typescript-eslint/no-explicit-any */
