import { CheckCircle2, CircleSlash2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  {
    attack: "Direct text injection",
    example: "A message asks the agent to ignore its policy.",
    analysis: "Not scored by the image route",
    result: "Block upstream",
    evidence: "Boundary documented",
    tone: "scope",
  },
  {
    attack: "Visible image instructions",
    example: "OCR finds an override plus a request for an API key.",
    analysis: "100/100 · 2 critical signals",
    result: "Block",
    evidence: "Automated policy test passed",
    tone: "block",
  },
  {
    attack: "Metadata payload",
    example: "EXIF or XMP text requests secret extraction.",
    analysis: "55/100 · 1 critical signal",
    result: "Block",
    evidence: "Automated policy test passed",
    tone: "block",
  },
  {
    attack: "Benign image",
    example: "OCR and metadata contain no instruction patterns.",
    analysis: "0/100 · 0 signals",
    result: "Release signed URL",
    evidence: "Live Cloudinary run verified",
    tone: "allow",
  },
] as const;

const status = {
  block: { icon: CircleSlash2, className: "border-danger/30 bg-danger/10 text-danger" },
  allow: { icon: CheckCircle2, className: "border-safe/30 bg-safe/10 text-safe-foreground" },
  scope: { icon: ShieldCheck, className: "border-border bg-secondary text-secondary-foreground" },
};

export function AttackMatrix() {
  return (
    <Card>
      <CardContent className="px-0">
        <Table>
          <TableCaption className="px-4 pb-4 text-left">
            Policy version 2026-08-22.1. Scores use the committed test fixtures; the benign result also completed a live Cloudinary OCR, moderation, metadata readback, and signed-delivery run.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Controlled case</TableHead>
              <TableHead>Observed policy data</TableHead>
              <TableHead>Delivery decision</TableHead>
              <TableHead>Verification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const StatusIcon = status[row.tone].icon;
              return (
                <TableRow key={row.attack}>
                  <TableCell className="min-w-64 whitespace-normal align-top">
                    <p className="font-medium">{row.attack}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{row.example}</p>
                  </TableCell>
                  <TableCell className="min-w-52 whitespace-normal align-top font-medium tabular-nums">{row.analysis}</TableCell>
                  <TableCell className="min-w-44 whitespace-normal align-top">
                    <Badge variant="outline" className={status[row.tone].className}>
                      <StatusIcon data-icon="inline-start" />
                      {row.result}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-56 whitespace-normal align-top text-muted-foreground">{row.evidence}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
