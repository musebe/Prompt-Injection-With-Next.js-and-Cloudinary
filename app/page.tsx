import { ArrowDown, Cloud, Eye, FileSearch, LockKeyhole } from "lucide-react";
import { AttackMatrix } from "@/components/attack-matrix";
import { ScanWorkbench } from "@/components/scan-workbench";
import { Badge } from "@/components/ui/badge";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Agent Shield Lab",
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  description: "A Next.js demo that quarantines and evaluates images before multimodal AI delivery.",
  featureList: [
    "Authenticated Cloudinary quarantine",
    "OCR and metadata inspection",
    "Image moderation",
    "Fail-closed policy decisions",
    "Signed agent delivery",
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

          <div id="top" className="flex max-w-4xl flex-col gap-6 py-14 sm:py-20 lg:py-24">
            <Badge variant="secondary" className="w-fit">Interactive image security scanner</Badge>
            <div className="flex flex-col gap-4">
              <h1 id="page-title" className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Scan images before they reach your AI agent.</h1>
              <p className="max-w-3xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">Upload an untrusted image. Cloudinary quarantines it, extracts visible text and metadata, runs moderation, and releases a signed agent URL only when every required check passes.</p>
            </div>
            <a href="#scanner" className="inline-flex min-h-11 w-fit items-center gap-2 py-2 text-sm font-medium underline-offset-4 hover:underline">Start a security scan <ArrowDown data-icon="inline-end" /></a>
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

      <section id="scanner" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="scanner-title">
        <div className="mb-8 max-w-3xl">
          <Badge variant="outline" className="mb-4">Live proof</Badge>
          <h2 id="scanner-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Scan an untrusted image</h2>
          <p className="mt-3 text-lg text-muted-foreground">The image is never public. A reviewer can inspect the signed asset, while the agent endpoint stays locked unless every required gate passes.</p>
        </div>
        <ScanWorkbench />
      </section>

      <section className="border-y bg-surface-subtle" aria-labelledby="matrix-title">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <Badge variant="outline" className="mb-4">Verified policy behavior</Badge>
            <h2 id="matrix-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">What the scanner does with each input</h2>
            <p className="mt-3 text-lg text-muted-foreground">The controlled cases below report the actual policy score, delivery decision, and available test evidence.</p>
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
