/**
 * Resolve a `callbackUrl` query param to a SAFE, same-origin relative path.
 *
 * Open-redirect guard: only accept a path that begins with a single "/", is not
 * protocol-relative ("//host"), contains no scheme or backslash trick, and
 * survives a decode pass. Anything else falls back to `fallback`.
 */
export function safeCallbackUrl(
  raw: string | string[] | null | undefined,
  fallback = "/account",
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (decoded.startsWith("//") || decoded.includes("\\") || /^\s*[a-z]+:/i.test(decoded)) {
    return fallback;
  }
  return value;
}
