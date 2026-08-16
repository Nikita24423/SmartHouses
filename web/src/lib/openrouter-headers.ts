/** OpenRouter HTTP headers must be ASCII-only (ByteString). */
export const OPENROUTER_APP_TITLE = "Design by Plan";

export function getOpenRouterHeaders(apiKey: string): Record<string, string> {
  const siteUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": siteUrl,
    "X-Title": OPENROUTER_APP_TITLE,
  };
}


