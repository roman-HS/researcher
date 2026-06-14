import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PROVIDER_RETRY_BASE_DELAY_MS,
  DEFAULT_PROVIDER_MAX_RETRIES,
} from "@/integrations/rapidapi/retry";
import { loadProviderRetryConfigFromEnv } from "@/integrations/rapidapi/load-retry-config";

vi.mock("@/lib/env/server", () => ({
  getServerEnv: vi.fn(),
}));

import { getServerEnv } from "@/lib/env/server";

describe("loadProviderRetryConfigFromEnv", () => {
  it("returns defaults when provider retry env overrides are unset", () => {
    vi.mocked(getServerEnv).mockReturnValue({
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      EXECUTION_TRANSPORT: "direct",
    });

    expect(loadProviderRetryConfigFromEnv()).toEqual({
      maxRetries: DEFAULT_PROVIDER_MAX_RETRIES,
      baseDelayMs: DEFAULT_PROVIDER_RETRY_BASE_DELAY_MS,
    });
  });

  it("applies provider retry env overrides", () => {
    vi.mocked(getServerEnv).mockReturnValue({
      NODE_ENV: "test",
      APP_URL: "http://localhost:3000",
      EXECUTION_TRANSPORT: "direct",
      EXECUTION_PROVIDER_MAX_RETRIES: 1,
      EXECUTION_PROVIDER_RETRY_BASE_DELAY_MS: 250,
    });

    expect(loadProviderRetryConfigFromEnv()).toEqual({
      maxRetries: 1,
      baseDelayMs: 250,
    });
  });
});
