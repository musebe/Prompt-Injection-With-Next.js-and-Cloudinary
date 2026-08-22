import { describe, expect, it } from "vitest";
import { toSafeScanError } from "@/lib/cloudinary/errors";

describe("toSafeScanError", () => {
  it("explains an inactive OCR add-on", () => {
    expect(toSafeScanError({ http_code: 420, message: "You don't have an active subscription for OCR Text Detection and Extraction" })).toMatchObject({
      code: "ocr_addon_inactive",
      status: 424,
    });
  });

  it("explains rejected Cloudinary credentials without echoing them", () => {
    expect(toSafeScanError({ http_code: 401, message: "Invalid Signature abc123" })).toEqual({
      code: "cloudinary_auth_failed",
      message: "Cloudinary rejected the server credentials. Check the cloud name, API key, and rotated API secret, then restart Next.js.",
      status: 502,
    });
  });

  it("routes missing structured metadata to the setup command", () => {
    expect(toSafeScanError({ message: "Unknown metadata field external_id" }).code).toBe("metadata_not_configured");
  });

  it("preserves a rate-limit status", () => {
    expect(toSafeScanError({ http_code: 429, message: "Rate limit exceeded" }).status).toBe(429);
  });
});
