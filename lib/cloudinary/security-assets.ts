import "server-only";

import { randomUUID } from "node:crypto";
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import { getCloudinary } from "@/lib/cloudinary/config";
import type {
  AnalysisStatus,
  CloudinaryAssetRecord,
  ModerationStatus,
  PolicyResult,
  ScanRecord,
} from "@/lib/security/types";

const METADATA = {
  decision: "pi_decision",
  riskScore: "pi_risk_score",
  policyVersion: "pi_policy_version",
  ocrStatus: "pi_ocr_status",
  moderationStatus: "pi_moderation_status",
  ocrText: "pi_ocr_text",
  metadataText: "pi_metadata_text",
  signals: "pi_signals",
  originalFilename: "pi_original_filename",
  scannedAt: "pi_scanned_at",
} as const;

type UploadWithAnalysis = UploadApiResponse & {
  asset_id: string;
  media_metadata?: unknown;
  info?: {
    ocr?: {
      adv_ocr?: {
        status?: string;
        data?: Array<{ textAnnotations?: Array<{ description?: string }> }>;
      };
    };
  };
  moderation?: Array<{ kind?: string; status?: string }>;
};

interface AssetIdApi {
  resource_by_asset_id(
    assetId: string,
    callback?: undefined,
    options?: Record<string, unknown>,
  ): Promise<CloudinaryAssetRecord>;
}

function optionalAnalysisOptions(): Partial<Pick<UploadApiOptions, "ocr" | "moderation">> {
  const ocr = process.env.CLOUDINARY_OCR_MODE ?? "adv_ocr";
  const moderation = process.env.CLOUDINARY_MODERATION_KIND ?? "aws_rek";
  return {
    ...(ocr === "off" ? {} : { ocr }),
    ...(moderation === "off" ? {} : { moderation }),
  };
}

export async function uploadQuarantinedImage(buffer: Buffer, filename: string) {
  const cloudinary = getCloudinary();
  const options: UploadApiOptions = {
    ...optionalAnalysisOptions(),
    resource_type: "image",
    type: "authenticated",
    public_id: `agent-shield/quarantine/${randomUUID()}`,
    overwrite: false,
    media_metadata: true,
    tags: ["agent-shield", "quarantine", "untrusted-input"],
    context: { original_filename: filename, trust_boundary: "untrusted" },
    headers: "X-Robots-Tag: noindex, nofollow",
  };

  return new Promise<UploadWithAnalysis>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Cloudinary did not return an upload result."));
        return;
      }
      resolve(result as UploadWithAnalysis);
    });
    stream.end(buffer);
  });
}

export function extractOcr(upload: UploadWithAnalysis): { text: string; status: AnalysisStatus } {
  if ((process.env.CLOUDINARY_OCR_MODE ?? "adv_ocr") === "off") return { text: "", status: "unavailable" };
  const analysis = upload.info?.ocr?.adv_ocr;
  const status = analysis?.status;
  const text = analysis?.data
    ?.flatMap((page) => page.textAnnotations?.[0]?.description ?? [])
    .join("\n")
    .trim() ?? "";

  if (status === "complete") return { text, status: "complete" };
  if (status === "pending") return { text, status: "pending" };
  return { text, status: status ? "failed" : "unavailable" };
}

export function extractModerationStatus(value: { moderation?: unknown }): ModerationStatus {
  if ((process.env.CLOUDINARY_MODERATION_KIND ?? "aws_rek") === "off") return "unavailable";
  const moderation = Array.isArray(value.moderation) ? value.moderation : [];
  const statuses = moderation.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (item && typeof item === "object" && "status" in item) return [String(item.status)];
    return [];
  });
  if (statuses.includes("rejected")) return "rejected";
  if (statuses.includes("approved")) return "approved";
  return statuses.includes("pending") ? "pending" : "unavailable";
}

export async function persistPolicyResult(
  upload: Pick<UploadWithAnalysis, "public_id">,
  filename: string,
  ocrText: string,
  metadataText: string,
  ocrStatus: AnalysisStatus,
  moderationStatus: ModerationStatus,
  result: PolicyResult,
) {
  const cloudinary = getCloudinary();
  await cloudinary.api.update(upload.public_id, {
    resource_type: "image",
    type: "authenticated",
    metadata: {
      [METADATA.decision]: result.decision,
      [METADATA.riskScore]: String(result.score),
      [METADATA.policyVersion]: result.policyVersion,
      [METADATA.ocrStatus]: ocrStatus,
      [METADATA.moderationStatus]: moderationStatus,
      [METADATA.ocrText]: ocrText.slice(0, 20_000),
      [METADATA.metadataText]: metadataText.slice(0, 20_000),
      [METADATA.signals]: JSON.stringify(result.signals.map(({ id, source, label, severity, score }) => ({ id, source, label, severity, score }))),
      [METADATA.originalFilename]: filename.slice(0, 240),
      [METADATA.scannedAt]: new Date().toISOString().slice(0, 10),
    },
  });
}

export async function deleteQuarantinedImage(publicId: string) {
  const cloudinary = getCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", type: "authenticated", invalidate: true });
}

export async function getAssetById(assetId: string) {
  const cloudinary = getCloudinary();
  const api = cloudinary.api as typeof cloudinary.api & AssetIdApi;
  return api.resource_by_asset_id(assetId, undefined, {
    metadata: true,
    context: true,
    moderations: true,
  });
}

export function createSignedAssetUrl(publicId: string) {
  return getCloudinary().url(publicId, {
    resource_type: "image",
    type: "authenticated",
    sign_url: true,
    secure: true,
  });
}

function parseSignals(raw: string | number | undefined): PolicyResult["signals"] {
  if (typeof raw !== "string") return [];
  try {
    const value = JSON.parse(raw) as PolicyResult["signals"];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function assetToScanRecord(asset: CloudinaryAssetRecord): ScanRecord {
  const metadata = asset.metadata ?? {};
  const decision = String(metadata[METADATA.decision] ?? "review") as ScanRecord["decision"];
  const ocrStatus = String(metadata[METADATA.ocrStatus] ?? "unavailable") as AnalysisStatus;
  const storedModeration = String(metadata[METADATA.moderationStatus] ?? "unavailable") as ModerationStatus;
  const liveModeration = extractModerationStatus(asset);
  const moderationStatus = liveModeration === "unavailable" ? storedModeration : liveModeration;

  return {
    scanId: asset.asset_id,
    filename: String(metadata[METADATA.originalFilename] ?? "uploaded image"),
    format: asset.format,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    createdAt: asset.created_at,
    decision,
    score: Number(metadata[METADATA.riskScore] ?? 0),
    policyVersion: String(metadata[METADATA.policyVersion] ?? "unknown"),
    ocrText: String(metadata[METADATA.ocrText] ?? ""),
    ocrStatus,
    moderationStatus,
    signals: parseSignals(metadata[METADATA.signals]),
    reviewUrl: createSignedAssetUrl(asset.public_id),
    agentUrlAvailable: decision === "allow" && moderationStatus === "approved" && ocrStatus === "complete",
  };
}

export { METADATA };
