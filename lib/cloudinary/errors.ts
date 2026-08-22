interface CloudinaryErrorShape {
  http_code?: number;
  message?: string;
  name?: string;
  request_id?: string;
}

export interface SafeScanError {
  code: string;
  message: string;
  status: number;
}

function asCloudinaryError(error: unknown): CloudinaryErrorShape {
  return error && typeof error === "object" ? error as CloudinaryErrorShape : {};
}

export function toSafeScanError(error: unknown): SafeScanError {
  const cloudinaryError = asCloudinaryError(error);
  const message = cloudinaryError.message?.toLowerCase() ?? "";

  if (/active subscription|not subscribed|add-on.*not.*enabled/.test(message)) {
    if (/ocr|text detection/.test(message)) {
      return {
        code: "ocr_addon_inactive",
        message: "Cloudinary OCR is not active. Enable OCR Text Detection and Extraction under Settings → Add-ons, then retry.",
        status: 424,
      };
    }
    if (/aws|rekognition|moderation/.test(message)) {
      return {
        code: "moderation_addon_inactive",
        message: "Cloudinary moderation is not active. Enable Amazon Rekognition AI Moderation under Settings → Add-ons, then retry.",
        status: 424,
      };
    }
    return {
      code: "cloudinary_addon_inactive",
      message: "A required Cloudinary add-on is not active for this product environment.",
      status: 424,
    };
  }

  if (/metadata/.test(message) && /field|external.?id|invalid|unknown|not found/.test(message)) {
    return {
      code: "metadata_not_configured",
      message: "Cloudinary structured metadata is not configured. Run npm run cloudinary:setup, then retry.",
      status: 424,
    };
  }

  if (/invalid signature|unknown api key|invalid api key|must supply api_key|authentication/.test(message)) {
    return {
      code: "cloudinary_auth_failed",
      message: "Cloudinary rejected the server credentials. Check the cloud name, API key, and rotated API secret, then restart Next.js.",
      status: 502,
    };
  }

  if (cloudinaryError.http_code === 429 || /rate limit/.test(message)) {
    return {
      code: "cloudinary_rate_limited",
      message: "Cloudinary rate-limited the scan. Wait briefly, then retry.",
      status: 429,
    };
  }

  return {
    code: "cloudinary_scan_failed",
    message: "The Cloudinary scan pipeline failed. Check the server log and Cloudinary add-on configuration.",
    status: 502,
  };
}

export function safeErrorContext(error: unknown) {
  const cloudinaryError = asCloudinaryError(error);
  return {
    name: cloudinaryError.name ?? "Error",
    httpCode: cloudinaryError.http_code ?? null,
    requestId: cloudinaryError.request_id ?? null,
  };
}
