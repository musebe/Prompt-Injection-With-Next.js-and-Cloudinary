export const POLICY_VERSION = "2026-08-22.1";

export type SecurityDecision = "allow" | "review" | "block";
export type SignalSource = "ocr" | "metadata" | "moderation" | "file";
export type AnalysisStatus = "complete" | "pending" | "failed" | "unavailable";
export type ModerationStatus = "approved" | "rejected" | "pending" | "unavailable";

export interface SecuritySignal {
  id: string;
  source: SignalSource;
  label: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  excerpt?: string;
}

export interface PolicyInput {
  ocrText: string;
  metadataText: string;
  ocrStatus: AnalysisStatus;
  moderationStatus: ModerationStatus;
}

export interface PolicyResult {
  decision: SecurityDecision;
  score: number;
  signals: SecuritySignal[];
  policyVersion: string;
}

export interface ScanRecord extends PolicyResult {
  scanId: string;
  filename: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  createdAt: string;
  ocrText: string;
  ocrStatus: AnalysisStatus;
  moderationStatus: ModerationStatus;
  reviewUrl: string;
  agentUrlAvailable: boolean;
}

export interface CloudinaryAssetRecord {
  asset_id: string;
  public_id: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  created_at: string;
  type: string;
  resource_type: string;
  metadata?: Record<string, string | number | undefined>;
  context?: { custom?: Record<string, string | undefined> };
  moderation?: Array<{ kind?: string; status?: string }>;
}
