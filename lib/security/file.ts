const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const SIGNATURES = [
  { mime: "image/jpeg", test: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  { mime: "image/png", test: (bytes: Uint8Array) => bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]) },
  { mime: "image/webp", test: (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP" },
] as const;

export function validateImageFile(file: File, bytes: Uint8Array) {
  if (file.size === 0) throw new Error("Choose a non-empty image file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("The image exceeds the 8 MB upload limit.");

  const detected = SIGNATURES.find((signature) => signature.test(bytes));
  if (!detected) throw new Error("Only genuine JPEG, PNG, and WebP images are accepted.");
  if (file.type && file.type !== detected.mime) {
    throw new Error(`The declared file type (${file.type}) does not match its ${detected.mime} contents.`);
  }

  return detected.mime;
}

export const uploadLimits = {
  maxBytes: MAX_UPLOAD_BYTES,
  acceptedTypes: SIGNATURES.map((signature) => signature.mime),
};
