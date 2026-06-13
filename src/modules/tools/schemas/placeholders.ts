import { z } from "zod";

/** Intentionally minimal until executor stories define real step I/O. */
export const toolInputPlaceholderSchema = z.object({});

export type ToolInputPlaceholder = z.infer<typeof toolInputPlaceholderSchema>;

/** Intentionally minimal until executor stories define real step I/O. */
export const toolOutputPlaceholderSchema = z.object({});

export type ToolOutputPlaceholder = z.infer<typeof toolOutputPlaceholderSchema>;
