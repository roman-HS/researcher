/**
 * Provider adapter contracts (RapidAPI/Zillow request and response shapes).
 *
 * Canonical, provider-agnostic DTOs belong in `@/contracts/domain`.
 *
 * @see Naming and import rules in `src/contracts/index.ts`
 */

export {
  providerNameSchema,
  providerSourceMetadataSchema,
  type ProviderName,
  type ProviderSourceMetadata,
} from "@/contracts/domain";
