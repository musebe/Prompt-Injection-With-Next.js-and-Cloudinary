import { NextResponse } from "next/server";
import {
  assetToScanRecord,
  extractModerationStatus,
  getAssetById,
  persistPolicyResult,
} from "@/lib/cloudinary/security-assets";
import { evaluateImagePolicy } from "@/lib/security/policy";
import { canReviewAsset } from "@/lib/security/session";
import type { AnalysisStatus } from "@/lib/security/types";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await context.params;
  if (!(await canReviewAsset(scanId))) {
    return NextResponse.json({ error: "This scan is not available in the current review session." }, { status: 403 });
  }

  try {
    const asset = await getAssetById(scanId);
    const stored = assetToScanRecord(asset);
    const moderationStatus = extractModerationStatus(asset);
    const result = evaluateImagePolicy({
      ocrText: stored.ocrText,
      metadataText: String(asset.metadata?.pi_metadata_text ?? ""),
      ocrStatus: stored.ocrStatus as AnalysisStatus,
      moderationStatus,
    });
    await persistPolicyResult(
      { public_id: asset.public_id },
      stored.filename,
      stored.ocrText,
      String(asset.metadata?.pi_metadata_text ?? ""),
      stored.ocrStatus,
      moderationStatus,
      result,
    );
    const refreshed = await getAssetById(scanId);
    return NextResponse.json(assetToScanRecord(refreshed), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The analysis status could not be refreshed." }, { status: 500 });
  }
}
