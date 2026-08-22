import nextEnv from "@next/env";
import cloudinaryPackage from "cloudinary";

const { loadEnvConfig } = nextEnv;
const { v2: cloudinary } = cloudinaryPackage;

loadEnvConfig(process.cwd());

if (!process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
    signature_algorithm: "sha256",
  });
}

const fields = [
  ["pi_decision", "Prompt-injection decision"],
  ["pi_risk_score", "Prompt-injection risk score"],
  ["pi_policy_version", "Prompt-injection policy version"],
  ["pi_ocr_status", "OCR status"],
  ["pi_moderation_status", "Moderation status"],
  ["pi_ocr_text", "Untrusted OCR text"],
  ["pi_metadata_text", "Untrusted embedded metadata"],
  ["pi_signals", "Security signal summary"],
  ["pi_original_filename", "Original filename"],
  ["pi_scanned_at", "Security scan date"],
];

const existing = await cloudinary.api.list_metadata_fields();
const existingIds = new Set(existing.metadata_fields.map((field) => field.external_id));

for (const [external_id, label] of fields) {
  if (existingIds.has(external_id)) {
    console.log(`exists  ${external_id}`);
    continue;
  }
  await cloudinary.api.add_metadata_field({ external_id, label, type: "string", mandatory: false });
  console.log(`created ${external_id}`);
}

console.log("Cloudinary structured metadata is ready.");
