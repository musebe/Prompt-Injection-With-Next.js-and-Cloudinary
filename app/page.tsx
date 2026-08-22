import { ArrowDown, BadgeCheck, Cloud, Eye, FileSearch, LockKeyhole } from "lucide-react";
import { AttackMatrix } from "@/components/attack-matrix";
import { ScanWorkbench } from "@/components/scan-workbench";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: "How to Protect Multimodal AI Agents From Image Prompt Injection With Next.js and Cloudinary",
      description: "A quarantine-first image ingestion demo using OCR, moderation, structured metadata, and signed delivery URLs.",
      author: { "@type": "Person", name: "Eugene Musebe" },
      dateModified: "2026-08-22",
      mainEntityOfPage: siteUrl,
      keywords: "image prompt injection, multimodal AI security, secure AI image uploads, vision model prompt injection",
    },
    {
      "@type": "SoftwareApplication",
      name: "Agent Shield Lab",
      applicationCategory: "SecurityApplication",
      operatingSystem: "Web",
      description: "A Next.js demo that quarantines and evaluates images before multimodal AI delivery.",
    },
    {
      "@type": "FAQPage",
      mainEntity: [{
        "@type": "Question",
        name: "Can hidden instructions inside an image manipulate an AI agent?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. A multimodal model may interpret visible or adversarial image content as instructions. This demo reduces exposure by quarantining uploads, extracting visible text and metadata, applying a fail-closed policy, and releasing only approved assets. It does not claim to detect every steganographic or model-specific attack.",
        },
      }],
    },
  ],
};

const steps = [
  { icon: Cloud, label: "Quarantine", detail: "Authenticated Cloudinary asset" },
  { icon: FileSearch, label: "Inspect", detail: "OCR, metadata, moderation" },
  { icon: Eye, label: "Decide", detail: "Allow, review, or block" },
  { icon: LockKeyhole, label: "Release", detail: "Signed URL only if approved" },
];

export default function Home() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="border-b bg-surface-subtle" aria-labelledby="page-title">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between" aria-label="Primary navigation">
            <a href="#top" className="inline-flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true"><LockKeyhole /></span>
              Agent Shield Lab
            </a>
            <Badge variant="outline" className="hidden sm:inline-flex">Cloudinary × Next.js</Badge>
          </nav>

          <div id="top" className="grid gap-10 py-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)] lg:items-end lg:py-24">
            <div className="flex flex-col gap-6">
              <Badge variant="secondary" className="w-fit">AI security · interactive demo</Badge>
              <div className="flex flex-col gap-4">
                <h1 id="page-title" className="max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Stop image prompt injection before it reaches your AI agent.</h1>
                <p className="max-w-3xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">Upload an image into a quarantine-first Next.js pipeline. Cloudinary OCR, embedded metadata inspection, moderation, and structured metadata determine whether a signed agent URL is released.</p>
              </div>
              <a href="#scanner" className="inline-flex w-fit items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">Test the defense layer <ArrowDown data-icon="inline-end" /></a>
            </div>

            <Card className="bg-background">
              <CardHeader><CardTitle>Editorial brief</CardTitle><CardDescription>The proof this demo is designed to support.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Metric label="Category" value="AI Security" />
                <Metric label="Original deadline" value="Aug 16, 2026" />
                <Metric label="Opportunity" value="10/10" />
                <Metric label="Buildability" value="8/10" />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-b" aria-labelledby="pipeline-title">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 id="pipeline-title" className="sr-only">Security pipeline</h2>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, label, detail }, index) => (
              <li key={label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary" aria-hidden="true"><Icon /></span>
                <div><p className="font-medium">{index + 1}. {label}</p><p className="text-sm text-muted-foreground">{detail}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="scanner" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="scanner-title">
        <div className="mb-8 max-w-3xl">
          <Badge variant="outline" className="mb-4">Live proof</Badge>
          <h2 id="scanner-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Scan an untrusted image</h2>
          <p className="mt-3 text-lg text-muted-foreground">The image is never public. A reviewer can inspect the signed asset, while the agent endpoint stays locked unless every required gate passes.</p>
        </div>
        <ScanWorkbench />
      </section>

      <Separator />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="answer-title">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
          <div><Badge variant="secondary" className="mb-4">Direct answer</Badge><h2 id="answer-title" className="text-3xl font-semibold tracking-tight">Can hidden instructions inside an image manipulate an AI agent?</h2></div>
          <div className="flex flex-col gap-5 text-lg leading-8 text-muted-foreground">
            <p><strong className="text-foreground">Yes.</strong> A vision-capable model can mistake image content for trusted instructions. Visible text, document screenshots, and metadata are distinct input surfaces that deserve their own controls.</p>
            <p>This demo reduces the attack surface; it does not prove an image is harmless. OCR can miss stylized or low-contrast text, metadata inspection does not detect pixels, and neither guarantees detection of steganography or model-specific adversarial examples. Uncertain analysis is routed to review instead of silently passed downstream.</p>
          </div>
        </div>
      </section>

      <section className="border-y bg-surface-subtle" aria-labelledby="matrix-title">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <Badge variant="outline" className="mb-4"><BadgeCheck data-icon="inline-start" /> GEO proof asset</Badge>
            <h2 id="matrix-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Image prompt-injection attack matrix</h2>
            <p className="mt-3 text-lg text-muted-foreground">Four test cases connect each attack surface to the control that owns it and the expected fail-closed result.</p>
          </div>
          <AttackMatrix />
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-10 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <p className="font-medium text-foreground">Built as a defensive learning demo. Do not treat a passing heuristic scan as a safety guarantee.</p>
        <p>Next.js · Cloudinary authenticated delivery · OCR · moderation · structured metadata</p>
      </footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-secondary p-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
