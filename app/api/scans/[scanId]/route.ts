import { NextResponse } from "next/server";
import { assetToScanRecord, getAssetById } from "@/lib/cloudinary/security-assets";
import { canReviewAsset } from "@/lib/security/session";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await context.params;
  if (!(await canReviewAsset(scanId))) {
    return NextResponse.json({ error: "This scan is not available in the current review session." }, { status: 403 });
  }

  try {
    const asset = await getAssetById(scanId);
    return NextResponse.json(assetToScanRecord(asset), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The scan could not be loaded." }, { status: 404 });
  }
}
