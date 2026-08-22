import "server-only";

import { v2 as cloudinary } from "cloudinary";

let configured = false;

export function getCloudinaryReadiness() {
  const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
  const hasDiscreteCredentials = Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );

  return {
    credentials: hasCloudinaryUrl || hasDiscreteCredentials,
    sessionSecret: Boolean(process.env.DEMO_SESSION_SECRET && process.env.DEMO_SESSION_SECRET.length >= 32),
    ocr: process.env.CLOUDINARY_OCR_MODE ?? "adv_ocr",
    moderation: process.env.CLOUDINARY_MODERATION_KIND ?? "aws_rek",
  };
}

export function getCloudinary() {
  const readiness = getCloudinaryReadiness();
  if (!readiness.credentials) {
    throw new Error("Cloudinary credentials are missing. Copy .env.example to .env.local and add your account values.");
  }
  if (!configured && !process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
      signature_algorithm: "sha256",
    });
    configured = true;
  }
  return cloudinary;
}
