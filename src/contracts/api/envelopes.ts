import { z } from "zod";

import { apiErrorCodes } from "@/contracts/api/codes";

export const apiRequestIdSchema = z.uuid();

export type ApiRequestId = z.infer<typeof apiRequestIdSchema>;

export const apiValidationIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export type ApiValidationIssue = z.infer<typeof apiValidationIssueSchema>;

export const apiValidationErrorDetailsSchema = z.object({
  issues: z.array(apiValidationIssueSchema),
});

export type ApiValidationErrorDetails = z.infer<
  typeof apiValidationErrorDetailsSchema
>;

export const apiErrorSchema = z.object({
  code: z.enum(apiErrorCodes),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  retryAfterSeconds: z.number().int().nonnegative().optional(),
  requestId: apiRequestIdSchema.optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiErrorEnvelopeSchema = z.object({
  error: apiErrorSchema,
});

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;

export const apiMetaSchema = z.record(z.string(), z.unknown());

export type ApiMeta = z.infer<typeof apiMetaSchema>;

export const apiSuccessEnvelopeSchema = z.object({
  data: z.unknown(),
  meta: apiMetaSchema.optional(),
});

export type ApiSuccessEnvelope<T = unknown> = {
  data: T;
  meta?: ApiMeta;
};
