const FALLBACK_PATH = "/app";
const BLOCKED_REDIRECT_PREFIXES = ["/auth/callback"];

export function sanitizeRedirectPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = FALLBACK_PATH,
): string {
  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://cove.local");
    const path = `${url.pathname}${url.search}${url.hash}`;

    if (url.origin !== "https://cove.local") {
      return fallback;
    }

    if (BLOCKED_REDIRECT_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return fallback;
    }

    return path;
  } catch {
    return fallback;
  }
}

export function withSearchParam(
  path: string,
  key: string,
  value: string,
): string {
  const url = new URL(path, "https://cove.local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}
