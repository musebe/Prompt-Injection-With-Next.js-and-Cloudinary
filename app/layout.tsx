import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Agent Shield Lab | Scan Images Before AI Delivery",
  description: "Scan untrusted images with Cloudinary OCR, moderation, metadata inspection, and a fail-closed policy before multimodal AI delivery.",
  keywords: ["image prompt injection", "multimodal AI security", "secure AI image uploads", "vision model prompt injection", "Next.js Cloudinary"],
  authors: [{ name: "Eugene Musebe" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Agent Shield Lab",
    description: "A working Next.js and Cloudinary defense layer that scans untrusted images before signed AI delivery.",
    url: "/",
    siteName: "Agent Shield Lab",
  },
  twitter: {
    card: "summary_large_image",
    title: "Protect Multimodal AI Agents From Image Prompt Injection",
    description: "Quarantine, inspect, score, and release image inputs with Next.js and Cloudinary.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={cn(geist.variable, geistMono.variable)}><body>{children}</body></html>;
}
