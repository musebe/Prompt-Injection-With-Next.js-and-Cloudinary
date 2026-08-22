import { ImageResponse } from "next/og";

export const alt = "Agent Shield Lab — protect multimodal AI agents from image prompt injection";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ alignItems: "stretch", background: "#f7f8fc", color: "#171926", display: "flex", height: "100%", padding: 72, width: "100%" }}>
      <div style={{ border: "2px solid #d9ddea", borderRadius: 32, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56, width: "100%" }}>
        <div style={{ alignItems: "center", display: "flex", fontSize: 28, fontWeight: 700 }}>
          <span style={{ alignItems: "center", background: "#4857b8", borderRadius: 12, color: "white", display: "flex", height: 48, justifyContent: "center", marginRight: 18, width: 48 }}>S</span>
          Agent Shield Lab
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#4857b8", display: "flex", fontSize: 24, fontWeight: 700, marginBottom: 20 }}>NEXT.JS × CLOUDINARY × AI SECURITY</div>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 750, letterSpacing: "-2px", lineHeight: 1.05, maxWidth: 940 }}>Stop image prompt injection before it reaches your AI agent.</div>
        </div>
        <div style={{ color: "#656b7d", display: "flex", fontSize: 24 }}>OCR · metadata · moderation · signed delivery</div>
      </div>
    </div>,
    size,
  );
}
