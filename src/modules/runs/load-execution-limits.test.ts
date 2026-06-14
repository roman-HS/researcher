import { describe, expect, it, vi } from "vitest";

import { DEFAULT_EXECUTION_LIMITS } from "@/contracts/runs/execution-limits";
import { loadExecutionLimitsFromEnv } from "@/modules/runs/load-execution-limits";

vi.mock("@/lib/env/server", () => ({
  getServerEnv: vi.fn(),
}));

import { getServerEnv } from "@/lib/env/server";

describe("loadExecutionLimitsFromEnv", () => {
  it("returns defaults when execution env overrides are unset", () => {
    vi.mocked(getServerEnv).mockReturnValue({
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      EXECUTION_TRANSPORT: "direct",
    });

    expect(loadExecutionLimitsFromEnv()).toEqual(DEFAULT_EXECUTION_LIMITS);
  });

  it("applies execution env overrides and rapid api timeout fallback", () => {
    vi.mocked(getServerEnv).mockReturnValue({
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      EXECUTION_TRANSPORT: "direct",
      EXECUTION_MAX_LISTING_COUNT: 100,
      EXECUTION_MAX_PROPERTIES_ENRICHED_PER_RUN: 25,
      EXECUTION_MAX_PROVIDER_CALLS_PER_STEP: 10,
      EXECUTION_MAX_PROVIDER_CALLS_PER_RUN: 40,
      EXECUTION_PER_REQUEST_TIMEOUT_MS: 15_000,
      EXECUTION_MAX_RUN_DURATION_MS: 120_000,
      RAPIDAPI_TIMEOUT_MS: 5_000,
    });

    expect(loadExecutionLimitsFromEnv()).toEqual({
      maxListingCount: 100,
      maxPropertiesEnrichedPerRun: 25,
      maxProviderCallsPerStep: 10,
      maxProviderCallsPerRun: 40,
      perRequestTimeoutMs: 15_000,
      maxRunDurationMs: 120_000,
    });
  });
});
