import { NextResponse } from "next/server";
import { getCloudinaryReadiness } from "@/lib/cloudinary/config";
import {
  assetToScanRecord,
  deleteQuarantinedImage,
  extractModerationStatus,
  extractOcr,
  getAssetById,
  persistPolicyResult,
  uploadQuarantinedImage,
} from "@/lib/cloudinary/security-assets";
import { uploadLimits, validateImageFile } from "@/lib/security/file";
import { evaluateImagePolicy, flattenMetadata } from "@/lib/security/policy";
import { grantReviewAccess } from "@/lib/security/session";

export const runtime = "nodejs";

const MAX_PIXELS = 40_000_000;

function errorResponse(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "The image could not be scanned.";
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const readiness = getCloudinaryReadiness();
  if (!readiness.credentials || !readiness.sessionSecret) {
    return errorResponse(new Error("The demo is not configured. Complete .env.local and run npm run cloudinary:setup."), 503);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > uploadLimits.maxBytes + 256_000) {
    return errorResponse(new Error("The request exceeds the 8 MB upload limit."), 413);
  }

  let uploadedPublicId: string | undefined;
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) return errorResponse(new Error("Add an image using the image form field."), 400);

    const bytes = new Uint8Array(await image.arrayBuffer());
    validateImageFile(image, bytes);

    const upload = await uploadQuarantinedImage(Buffer.from(bytes), image.name);
    uploadedPublicId = upload.public_id;
    if (upload.width * upload.height > MAX_PIXELS) {
      throw new Error("The decoded image exceeds the 40 megapixel safety limit.");
    }

    const ocr = extractOcr(upload);
    const moderationStatus = extractModerationStatus(upload);
    const metadataText = `${image.name} ${flattenMetadata(upload.media_metadata)}`.trim();
    const result = evaluateImagePolicy({
      ocrText: ocr.text,
      metadataText,
      ocrStatus: ocr.status,
      moderationStatus,
    });

    await persistPolicyResult(upload, image.name, ocr.text, metadataText, ocr.status, moderationStatus, result);
    const asset = await getAssetById(upload.asset_id);
    await grantReviewAccess(upload.asset_id);

    return NextResponse.json(assetToScanRecord(asset), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (uploadedPublicId) {
      await deleteQuarantinedImage(uploadedPublicId).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "";
    const clientError = /limit|JPEG|PNG|WebP|file type|image file|non-empty/i.test(message);
    return errorResponse(error, clientError ? 422 : 500);
  }
}
