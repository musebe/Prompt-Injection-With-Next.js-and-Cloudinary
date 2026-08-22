import {
  POLICY_VERSION,
  type PolicyInput,
  type PolicyResult,
  type SecuritySignal,
  type SignalSource,
} from "@/lib/security/types";

interface PatternRule {
  id: string;
  label: string;
  pattern: RegExp;
  score: number;
  severity: SecuritySignal["severity"];
}

const RULES: PatternRule[] = [
  {
    id: "instruction-override",
    label: "Instruction override language",
    pattern: /\b(ignore|disregard|forget|override)\b[\s\S]{0,48}\b(previous|prior|above|system|developer|instructions?|rules?)\b/i,
    score: 55,
    severity: "critical",
  },
  {
    id: "prompt-boundary",
    label: "Prompt or role boundary reference",
    pattern: /\b(system|developer|assistant)\s*(prompt|message|instruction)|\bprompt\s*injection\b/i,
    score: 35,
    severity: "high",
  },
  {
    id: "secret-exfiltration",
    label: "Secret extraction request",
    pattern: /\b(reveal|print|return|send|exfiltrate|leak|show)\b[\s\S]{0,56}\b(secret|token|password|credential|api[ _-]?key|environment variable|system prompt)\b/i,
    score: 55,
    severity: "critical",
  },
  {
    id: "tool-execution",
    label: "Tool or command execution request",
    pattern: /\b(run|execute|call|invoke|open|browse|fetch|curl|wget)\b[\s\S]{0,48}\b(tool|command|shell|terminal|url|https?:\/\/|endpoint)\b/i,
    score: 40,
    severity: "high",
  },
  {
    id: "authority-claim",
    label: "Untrusted authority claim",
    pattern: /\b(these are|this is|follow)\b[\s\S]{0,40}\b(trusted|authorized|highest priority|new instructions?|admin instructions?)\b/i,
    score: 25,
    severity: "medium",
  },
  {
    id: "instructional-imperative",
    label: "Instruction-like imperative",
    pattern: /\b(you must|must now|do not mention|respond only|instead,? (?:you|do)|complete the following)\b/i,
    score: 20,
    severity: "medium",
  },
];

function compactExcerpt(value: string, index: number, length: number) {
  const start = Math.max(0, index - 36);
  const end = Math.min(value.length, index + length + 64);
  return value.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 180);
}

function matchRules(value: string, source: SignalSource): SecuritySignal[] {
  if (!value.trim()) return [];

  return RULES.flatMap((rule) => {
    const match = rule.pattern.exec(value);
    if (!match) return [];

    return [{
      id: `${source}-${rule.id}`,
      source,
      label: rule.label,
      severity: rule.severity,
      score: rule.score,
      excerpt: compactExcerpt(value, match.index, match[0].length),
    } satisfies SecuritySignal];
  });
}

export function evaluateImagePolicy(input: PolicyInput): PolicyResult {
  const signals = [
    ...matchRules(input.ocrText, "ocr"),
    ...matchRules(input.metadataText, "metadata"),
  ];

  if (input.moderationStatus === "rejected") {
    signals.push({
      id: "moderation-rejected",
      source: "moderation",
      label: "Cloudinary moderation rejected the image",
      severity: "critical",
      score: 100,
    });
  } else if (input.moderationStatus !== "approved") {
    signals.push({
      id: `moderation-${input.moderationStatus}`,
      source: "moderation",
      label: `Moderation is ${input.moderationStatus}`,
      severity: "medium",
      score: 20,
    });
  }

  if (input.ocrStatus !== "complete") {
    signals.push({
      id: `ocr-${input.ocrStatus}`,
      source: "ocr",
      label: `OCR analysis is ${input.ocrStatus}`,
      severity: "medium",
      score: 20,
    });
  }

  const score = Math.min(100, signals.reduce((total, signal) => total + signal.score, 0));
  const hasHardBlock = input.moderationStatus === "rejected" || signals.some((signal) => signal.score >= 50);
  const checksComplete = input.ocrStatus === "complete" && input.moderationStatus === "approved";
  const decision = hasHardBlock ? "block" : score >= 20 || !checksComplete ? "review" : "allow";

  return { decision, score, signals, policyVersion: POLICY_VERSION };
}

export function flattenMetadata(value: unknown): string {
  const output: string[] = [];
  const seen = new WeakSet<object>();

  function visit(node: unknown, depth: number) {
    if (depth > 6 || output.join(" ").length > 20_000) return;
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
      output.push(String(node));
      return;
    }
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, depth + 1));
      return;
    }
    Object.entries(node).forEach(([key, item]) => {
      output.push(key);
      visit(item, depth + 1);
    });
  }

  visit(value, 0);
  return output.join(" ").slice(0, 20_000);
}
