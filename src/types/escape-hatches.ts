/**
 * Intentional escape hatch for rare cases where `any` is unavoidable
 * (e.g. third-party gaps). Prefer `unknown` and narrowing instead.
 * This file is the sole ESLint exception for `@typescript-eslint/no-explicit-any`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- sole documented any escape hatch */
export type UnsafeAny = any;
/* eslint-enable @typescript-eslint/no-explicit-any */
