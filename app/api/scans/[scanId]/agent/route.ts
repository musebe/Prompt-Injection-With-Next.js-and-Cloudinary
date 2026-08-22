import { NextResponse } from "next/server";
import { assetToScanRecord, getAssetById } from "@/lib/cloudinary/security-assets";
import { canReviewAsset } from "@/lib/security/session";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await context.params;
  if (!(await canReviewAsset(scanId))) {
    return NextResponse.json({ error: "This scan is not available in the current review session." }, { status: 403 });
  }

  try {
    const asset = await getAssetById(scanId);
    const scan = assetToScanRecord(asset);
    if (!scan.agentUrlAvailable) {
      return NextResponse.json(
        { error: "Fail-closed policy: the image is not approved for agent delivery.", decision: scan.decision },
        { status: 409 },
      );
    }

    return NextResponse.json({
      approved: true,
      scanId,
      input: { type: "input_image", image_url: scan.reviewUrl },
      notice: "Pass only this approved payload to the multimodal model. OCR and metadata are intentionally excluded.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The approved payload could not be created." }, { status: 404 });
  }
}
