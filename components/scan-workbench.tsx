"use client";

import Image from "next/image";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleSlash2,
  FileImage,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import type { ScanRecord, SecurityDecision } from "@/lib/security/types";

type BusyAction = "scan" | "refresh" | "agent" | null;

const decisionStyle: Record<SecurityDecision, { icon: typeof CheckCircle2; label: string; className: string; summary: string }> = {
  allow: { icon: CheckCircle2, label: "Approved", className: "border-safe/30 bg-safe/10 text-safe-foreground", summary: "All required checks passed. The agent delivery gate can release a signed URL." },
  review: { icon: TriangleAlert, label: "Needs review", className: "border-warning/30 bg-warning/10 text-warning-foreground", summary: "One or more checks are pending, unavailable, or ambiguous. Agent delivery remains locked." },
  block: { icon: CircleSlash2, label: "Blocked", className: "border-danger/30 bg-danger/10 text-danger", summary: "High-confidence instruction or moderation signals were found. Agent delivery remains locked." },
};

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "The request failed.");
  return body;
}

function formatBytes(bytes: number) {
  return new Intl.NumberFormat("en", { style: "unit", unit: "megabyte", maximumFractionDigits: 2 }).format(bytes / 1_000_000);
}

export function ScanWorkbench() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentPayload, setAgentPayload] = useState<unknown>(null);
  const isBusy = busyAction !== null;

  function chooseFile(candidate?: File) {
    if (!candidate) return;
    setFile(candidate);
    setScan(null);
    setError(null);
    setAgentPayload(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    chooseFile(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || isBusy) return;
    setBusyAction("scan");
    setError(null);
    setAgentPayload(null);

    try {
      const body = new FormData();
      body.set("image", file);
      const response = await fetch("/api/scans", { method: "POST", body });
      setScan(await parseResponse<ScanRecord>(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The image could not be scanned.");
    } finally {
      setBusyAction(null);
    }
  }

  async function refreshScan() {
    if (!scan || isBusy) return;
    setBusyAction("refresh");
    setError(null);
    try {
      const response = await fetch(`/api/scans/${encodeURIComponent(scan.scanId)}/refresh`, { method: "POST" });
      setScan(await parseResponse<ScanRecord>(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The analysis could not be refreshed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function requestAgentPayload() {
    if (!scan || isBusy) return;
    setBusyAction("agent");
    setError(null);
    try {
      const response = await fetch(`/api/scans/${encodeURIComponent(scan.scanId)}/agent`, { method: "POST" });
      setAgentPayload(await parseResponse<unknown>(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The agent payload could not be created.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle>Untrusted input</CardTitle>
          <CardDescription>JPEG, PNG, or WebP · maximum 8 MB · server-side signed upload</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div
              className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-surface-subtle p-6 text-center focus-within:ring-3 focus-within:ring-ring/50"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <span className="grid size-12 place-items-center rounded-xl border bg-background" aria-hidden="true"><FileImage /></span>
              <div>
                <p className="font-medium">{file ? file.name : "Drop an image into quarantine"}</p>
                <p id="file-help" className="mt-1 text-sm text-muted-foreground">{file ? formatBytes(file.size) : "or choose a local file to begin the scan"}</p>
              </div>
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-describedby="file-help"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isBusy}>
                <Upload data-icon="inline-start" /> Choose image
              </Button>
            </div>

            {busyAction === "scan" && (
              <Progress value={58} aria-label="Scanning image">
                <ProgressLabel>Quarantining and inspecting</ProgressLabel>
                <ProgressValue>OCR + moderation</ProgressValue>
              </Progress>
            )}

            <Button type="submit" size="lg" disabled={!file || isBusy} className="w-full">
              {busyAction === "scan" ? <Spinner data-icon="inline-start" /> : <ShieldCheck data-icon="inline-start" />}
              Scan before agent delivery
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">The browser never receives your Cloudinary API secret or an unsigned upload preset.</CardFooter>
      </Card>

      <div className="flex min-w-0 flex-col gap-4" aria-live="polite">
        {error && <Alert variant="destructive"><AlertCircle /><AlertTitle>Request stopped</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {scan ? <ScanResult scan={scan} busyAction={busyAction} agentPayload={agentPayload} onRefresh={refreshScan} onRequestAgent={requestAgentPayload} /> : <EmptyResult />}
      </div>
    </div>
  );
}

function EmptyResult() {
  return (
    <Card className="min-h-96 justify-center border-dashed bg-surface-subtle">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-xl border bg-background text-muted-foreground" aria-hidden="true"><KeyRound /></span>
        <p className="font-medium">The delivery gate is locked</p>
        <p className="max-w-md text-sm text-muted-foreground">A decision trace, reviewer image, extracted text, and signed-agent payload status will appear here after the first scan.</p>
      </CardContent>
    </Card>
  );
}

function ScanResult({ scan, busyAction, agentPayload, onRefresh, onRequestAgent }: {
  scan: ScanRecord;
  busyAction: BusyAction;
  agentPayload: unknown;
  onRefresh: () => void;
  onRequestAgent: () => void;
}) {
  const style = decisionStyle[scan.decision];
  const StatusIcon = style.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle>Cloudinary decision record</CardTitle><CardDescription>Re-read from structured metadata, not trusted from client state.</CardDescription></div>
          <Badge variant="outline" className={style.className}><StatusIcon data-icon="inline-start" />{style.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Alert className={style.className}><StatusIcon /><AlertTitle>{style.label} · risk score {scan.score}/100</AlertTitle><AlertDescription>{style.summary}</AlertDescription></Alert>

        <div className="grid gap-5 sm:grid-cols-[minmax(10rem,.72fr)_minmax(0,1.28fr)]">
          <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
            <Image src={scan.reviewUrl} alt={`Reviewer preview of ${scan.filename}`} fill sizes="(max-width: 640px) 100vw, 240px" className="object-contain" />
          </div>
          <dl className="grid content-start grid-cols-2 gap-3 text-sm">
            <Datum label="Filename" value={scan.filename} wide />
            <Datum label="Dimensions" value={`${scan.width} × ${scan.height}`} />
            <Datum label="File" value={`${scan.format.toUpperCase()} · ${formatBytes(scan.bytes)}`} />
            <Datum label="OCR" value={scan.ocrStatus} />
            <Datum label="Moderation" value={scan.moderationStatus} />
            <Datum label="Policy" value={scan.policyVersion} wide />
          </dl>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-medium">Signals ({scan.signals.length})</h3><Badge variant="secondary">Untrusted evidence</Badge></div>
          {scan.signals.length ? (
            <ul className="grid gap-2">
              {scan.signals.map((signal) => <li key={signal.id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between gap-4"><span className="font-medium">{signal.label}</span><span className="tabular-nums text-muted-foreground">+{signal.score}</span></div>{signal.excerpt && <p className="mt-2 break-words text-muted-foreground">“{signal.excerpt}”</p>}</li>)}
            </ul>
          ) : <p className="rounded-lg border bg-surface-subtle p-3 text-sm text-muted-foreground">No policy patterns matched the extracted text or metadata.</p>}
        </div>

        <div>
          <h3 className="mb-3 font-medium">OCR output</h3>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-code p-4 font-mono text-xs text-code-foreground">{scan.ocrText || "No text was returned by OCR."}</pre>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" onClick={onRefresh} disabled={busyAction !== null}>
            {busyAction === "refresh" ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />} Refresh async checks
          </Button>
          <Button onClick={onRequestAgent} disabled={!scan.agentUrlAvailable || busyAction !== null}>
            {busyAction === "agent" ? <Spinner data-icon="inline-start" /> : <KeyRound data-icon="inline-start" />} Generate agent payload
          </Button>
        </div>

        {agentPayload !== null && (
          <div><h3 className="mb-3 font-medium">Approved downstream payload</h3><pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg border bg-code p-4 font-mono text-xs text-code-foreground">{JSON.stringify(agentPayload, null, 2)}</pre></div>
        )}
      </CardContent>
    </Card>
  );
}

function Datum({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "col-span-2 min-w-0 rounded-lg bg-secondary p-3" : "min-w-0 rounded-lg bg-secondary p-3"}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 truncate font-medium capitalize" title={value}>{value}</dd></div>;
}
