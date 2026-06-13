import {
  MAX_RAPIDAPI_ERROR_BODY_CHARS,
  type RapidApiSafeHeaders,
} from "@/integrations/rapidapi/types";

const SAFE_RESPONSE_HEADERS = new Set(["content-type", "retry-after"]);

const FORBIDDEN_RESPONSE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-rapidapi-key",
]);

export function extractSafeResponseHeaders(headers: Headers): RapidApiSafeHeaders {
  const safe: RapidApiSafeHeaders = {};

  headers.forEach((value, name) => {
    const lower = name.toLowerCase();

    if (FORBIDDEN_RESPONSE_HEADERS.has(lower)) {
      return;
    }

    if (SAFE_RESPONSE_HEADERS.has(lower) || lower.startsWith("x-ratelimit-")) {
      safe[lower] = value;
    }
  });

  return safe;
}

export type ParsedResponseBody = {
  body?: unknown;
  bodyText?: string;
};

export async function parseResponseBody(response: Response): Promise<ParsedResponseBody> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const rawText = await response.text();

  if (rawText.length === 0) {
    return {};
  }

  if (contentType.includes("application/json") || contentType.includes("+json")) {
    try {
      return { body: JSON.parse(rawText) as unknown };
    } catch {
      return {
        bodyText: truncateBodyText(rawText),
      };
    }
  }

  return {
    bodyText: truncateBodyText(rawText),
  };
}

function truncateBodyText(text: string): string {
  if (text.length <= MAX_RAPIDAPI_ERROR_BODY_CHARS) {
    return text;
  }

  return `${text.slice(0, MAX_RAPIDAPI_ERROR_BODY_CHARS)}…`;
}
