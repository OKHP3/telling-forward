import { describe, expect, it } from "vitest";
import { getFrontendCorsOrigin } from "../runtime-config";

describe("production frontend origin configuration", () => {
  it("strips the Pages path from a redirect URL before configuring CORS", () => {
    expect(
      getFrontendCorsOrigin({
        FRONTEND_URL: "https://okhp3.github.io/telling-forward/",
        FRONTEND_ORIGIN: undefined,
        NODE_ENV: "production",
      }),
    ).toBe("https://okhp3.github.io");
  });

  it("prefers the explicit origin when both values are configured", () => {
    expect(
      getFrontendCorsOrigin({
        FRONTEND_URL: "https://example.invalid/",
        FRONTEND_ORIGIN: "https://okhp3.github.io",
        NODE_ENV: "production",
      }),
    ).toBe("https://okhp3.github.io");
  });

  it("fails closed when production has no frontend origin", () => {
    expect(() =>
      getFrontendCorsOrigin({
        FRONTEND_URL: undefined,
        FRONTEND_ORIGIN: undefined,
        NODE_ENV: "production",
      }),
    ).toThrow("FRONTEND_ORIGIN must be set in production");
  });

  it("keeps development convenient when no origin is configured", () => {
    expect(
      getFrontendCorsOrigin({
        FRONTEND_URL: undefined,
        FRONTEND_ORIGIN: undefined,
        NODE_ENV: "development",
      }),
    ).toBe(true);
  });
});