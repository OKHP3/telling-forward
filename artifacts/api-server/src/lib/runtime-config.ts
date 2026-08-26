/**
 * Resolve the browser origin allowed to call the separately hosted API.
 *
 * FRONTEND_URL may include the Pages subpath because it is also used for
 * redirects. CORS must receive only the origin, not the path.
 */
export function getFrontendCorsOrigin(
  env: {
    FRONTEND_ORIGIN?: string;
    FRONTEND_URL?: string;
    NODE_ENV?: string;
  } = process.env,
): string | boolean {
  const configured = env.FRONTEND_ORIGIN?.trim() || env.FRONTEND_URL?.trim();

  if (!configured) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "FRONTEND_ORIGIN must be set in production so the API has an explicit CORS allowlist.",
      );
    }
    return true;
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(
      "FRONTEND_ORIGIN or FRONTEND_URL must be an absolute URL, such as https://okhp3.github.io/telling-forward/",
    );
  }

  if (env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("FRONTEND_ORIGIN must use HTTPS in production.");
  }

  return url.origin;
}