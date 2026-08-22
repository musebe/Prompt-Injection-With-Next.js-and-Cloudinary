import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Protect AI Agents From Image Prompt Injection | Cloudinary",
  description: "Build a quarantine-first Next.js image upload pipeline with Cloudinary OCR, moderation, structured metadata, and signed delivery URLs.",
  keywords: ["image prompt injection", "multimodal AI security", "secure AI image uploads", "vision model prompt injection", "Next.js Cloudinary"],
  authors: [{ name: "Eugene Musebe" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "article",
    title: "How to Protect Multimodal AI Agents From Image Prompt Injection",
    description: "A working Next.js and Cloudinary defense layer that scans untrusted image text and metadata before signed delivery.",
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
