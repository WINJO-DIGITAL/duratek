import { describe, expect, it } from "vitest";
import { isPreviewDeployment, outboundEmailSuppressed } from "./runtime-env";

describe("deployment detection", () => {
  it("treats preview and development builds as preview", () => {
    expect(isPreviewDeployment({ VERCEL_ENV: "preview" })).toBe(true);
    expect(isPreviewDeployment({ VERCEL_ENV: "development" })).toBe(true);
  });
  it("does not treat production, or a local run with no VERCEL_ENV, as preview", () => {
    expect(isPreviewDeployment({ VERCEL_ENV: "production" })).toBe(false);
    expect(isPreviewDeployment({})).toBe(false);
  });
});

describe("email in previews", () => {
  it("suppresses email from a preview build by default", () => {
    expect(outboundEmailSuppressed({ VERCEL_ENV: "preview" })).toBe(true);
  });
  it("can be allowed on purpose, and only with the exact flag", () => {
    expect(outboundEmailSuppressed({ VERCEL_ENV: "preview", ALLOW_EMAIL_FROM_PREVIEW: "true" })).toBe(false);
    expect(outboundEmailSuppressed({ VERCEL_ENV: "preview", ALLOW_EMAIL_FROM_PREVIEW: "yes" })).toBe(true);
  });
  it("never suppresses production, or a local run", () => {
    expect(outboundEmailSuppressed({ VERCEL_ENV: "production" })).toBe(false);
    expect(outboundEmailSuppressed({})).toBe(false);
  });
});
