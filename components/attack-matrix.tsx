import { AlertTriangle, CheckCircle2, CircleSlash2, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  { attack: "Direct text injection", example: "A user prompt says to ignore the agent policy.", surface: "Application message", control: "Input policy before image ingestion", result: "Block upstream", tone: "block" },
  { attack: "Visible image instructions", example: "Text in pixels asks the model to reveal secrets.", surface: "Rendered pixels", control: "Cloudinary OCR + instruction policy", result: "Block or review", tone: "block" },
  { attack: "Metadata payload", example: "EXIF or XMP fields contain tool-use commands.", surface: "Embedded metadata", control: "media_metadata inspection + policy", result: "Block or review", tone: "review" },
  { attack: "Benign image", example: "A normal image with non-instructional text.", surface: "Pixels and metadata", control: "All gates complete + moderation approved", result: "Release signed URL", tone: "allow" },
] as const;

const status = {
  block: { icon: CircleSlash2, className: "border-danger/30 bg-danger/10 text-danger" },
  review: { icon: AlertTriangle, className: "border-warning/30 bg-warning/10 text-warning-foreground" },
  allow: { icon: CheckCircle2, className: "border-safe/30 bg-safe/10 text-safe-foreground" },
};

export function AttackMatrix() {
  return (
    <Card>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Test case</TableHead><TableHead>Payload surface</TableHead><TableHead>Owning control</TableHead><TableHead>Expected disposition</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => {
                const StatusIcon = status[row.tone].icon;
                return (
                  <TableRow key={row.attack}>
                    <TableCell className="min-w-64 align-top"><p className="font-medium">{row.attack}</p><p className="mt-1 text-sm text-muted-foreground">{row.example}</p></TableCell>
                    <TableCell className="min-w-40 align-top">{row.surface}</TableCell>
                    <TableCell className="min-w-56 align-top"><span className="inline-flex items-center gap-2"><ScanSearch aria-hidden="true" />{row.control}</span></TableCell>
                    <TableCell className="min-w-44 align-top"><Badge variant="outline" className={status[row.tone].className}><StatusIcon data-icon="inline-start" />{row.result}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
