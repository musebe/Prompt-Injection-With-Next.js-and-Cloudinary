import { NextResponse } from "next/server";
import { getCloudinaryReadiness } from "@/lib/cloudinary/config";

export const runtime = "nodejs";

export function GET() {
  const readiness = getCloudinaryReadiness();
  const ready = readiness.credentials && readiness.sessionSecret;

  return NextResponse.json(
    {
      ready,
      checks: readiness,
      setupCommand: ready ? undefined : "npm run cloudinary:setup",
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
