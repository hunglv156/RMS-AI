// Mirrors screening/models.py, assessment/evidence.py, scoring/engine.py and llm/base.py.
export type Level =
  "strong" | "adequate" | "partial" | "absent" | "unknown" | "needs_review";
export interface JDCriterion {
  code: string;
  label: string;
  description: string;
  priority: "must_have" | "nice_to_have";
  weight: number;
  keywords: string[];
}
export interface JobDescription {
  id: string;
  title: string;
  summary: string;
  criteria: JDCriterion[];
}
export interface PipelineConfig {
  context_mode: "full" | "retrieved";
  retrieval_mode: "lexical" | "dense" | "hybrid";
  retrieval_k: number;
  prompt_version: "screening-v1" | "screening-v2";
  min_coverage: number;
  rubric_values: Record<string, number>;
}
export interface ActiveConfig {
  model: string;
  prompt_version: string;
  context_mode: string;
  retrieval_mode: string;
  retrieval_k: number;
  hedge_after_s: number | null;
  escalation: { enabled: boolean; model: string | null; triggers: string[] };
  min_coverage: number;
}
export interface EvidenceQuote {
  quote: string;
  start_offset?: number | null;
  end_offset?: number | null;
}
export interface QuoteVerification {
  valid: boolean;
  start_offset?: number | null;
  end_offset?: number | null;
  reason?: string | null;
  ambiguous: boolean;
}
export interface CriterionAssessment {
  criterion_id: string;
  level: Level;
  confidence: number;
  reason: string;
  evidence: EvidenceQuote[];
  missing_information: string[];
}
export interface ScreenedCriterion {
  assessment: CriterionAssessment;
  validation: {
    level: Level;
    raw_level: string;
    reason: string | null;
    evidence_valid: boolean;
  };
  evidence: { evidence: EvidenceQuote; verification: QuoteVerification }[];
  scoring: {
    criterion_id: string;
    weight: number;
    priority: "must_have" | "nice_to_have";
    status: string;
    match_value: number | null;
    validated: boolean;
  };
  score: number | null;
  weighted_points: number | null;
}
export interface ScoreOutput {
  score_state: "scored" | "insufficient_coverage";
  observed_score: number | null;
  coverage: number;
  lower_bound: number;
  upper_bound: number;
  requires_manual_review: boolean;
}
export interface LLMMetadata {
  provider: string;
  model: string;
  temperature: number;
  started_at: string;
  latency_ms: number;
  input_tokens?: number | null;
  output_tokens?: number | null;
  attempts: number;
  finish_reason?: string | null;
  response_model?: string | null;
  hedged?: boolean | null;
  winner?: "primary" | "hedge" | null;
}
export interface ScreeningResult {
  jd_id: string;
  criteria: ScreenedCriterion[];
  total: ScoreOutput;
  llm: LLMMetadata;
  versions: {
    pipeline: string;
    prompt: string;
    model: string;
    config: PipelineConfig;
    retrieval: Record<string, unknown>;
    extraction?: Record<string, unknown> | null;
    cv_sha256: string;
    jd_sha256: string;
  };
  escalation?: {
    triggered: boolean;
    reasons: ("needs_review" | "coverage_band")[];
    primary_result_summary: Record<string, unknown>;
    primary_latency_s: number;
    escalation_latency_s: number;
    total_latency_s: number;
    escalation_model: string;
    error: Record<string, string> | null;
  };
}
export interface ScreeningEnvelope {
  screening: ScreeningResult;
  extraction: { pages: number; ocr_pages: number; chars: number };
  latency_s: number;
  config: ActiveConfig;
}
export interface SampleJD {
  id: string;
  title: string;
  summary: string;
  jd: JobDescription;
}
export interface ScreeningClient {
  config(signal?: AbortSignal): Promise<ActiveConfig>;
  samples(signal?: AbortSignal): Promise<SampleJD[]>;
  screen(
    cv: File,
    jd: JobDescription,
    signal: AbortSignal,
  ): Promise<ScreeningEnvelope>;
}
