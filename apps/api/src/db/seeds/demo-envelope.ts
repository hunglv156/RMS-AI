import { hash, canonical, jdHash } from "../../screenings/validation";
export function manifest() {
  const value = {
    build_revision: "synthetic-archive-v1",
    mode: "deterministic",
    provider: "deterministic",
    models: { primary: "deterministic-v1", escalation: null },
    prompts: { version: "screening-v2", sha256: hash("prompt") },
    scoring: {
      version: "scoring-v1",
      rubric_values: { strong: 1, adequate: 0.7, partial: 0.4, absent: 0 },
      min_coverage: 0.8,
    },
    retrieval: {
      context_mode: "retrieved",
      mode: "lexical",
      k: 5,
      version: "retrieval-v1",
    },
    parser: {
      version: "extractor-v1",
      normalization_version: "normalization-v1",
    },
    hedge: { after_s: null },
    escalation: { enabled: false, triggers: [] },
    deadlines: { aggregate_s: 150, extraction_s: 45 },
    provider_settings: {
      base_url: null,
      temperature: 0,
      timeout_s: 60,
      max_retries: 0,
      structured_output_version: "v1",
    },
  };
  return { ...value, fingerprint: hash(canonical(value)) };
}
export function envelope(input: any) {
  const text = input.text,
    m = input.manifest;
  return {
    screening: {
      jd_id: input.jd.id,
      criteria: input.jd.criteria.map((c: any) => ({
        assessment: {
          criterion_id: c.code,
          level: "unknown",
          confidence: 0,
          reason: "Deterministic fixture; human review required",
          evidence: [],
          missing_information: ["Verify experience"],
        },
        validation: {
          level: "unknown",
          raw_level: "unknown",
          reason: null,
          evidence_valid: false,
        },
        evidence: [],
        scoring: {
          criterion_id: c.code,
          weight: c.weight,
          priority: c.priority,
          status: "unknown",
          match_value: null,
          validated: false,
        },
        score: null,
        weighted_points: null,
      })),
      total: {
        score_state: "insufficient_coverage",
        observed_score: null,
        coverage: 0,
        lower_bound: 0,
        upper_bound: 100,
        requires_manual_review: true,
      },
      llm: {
        provider: "deterministic",
        model: "deterministic-v1",
        temperature: 0,
        started_at: new Date().toISOString(),
        latency_ms: 1,
        attempts: 1,
      },
      versions: {
        pipeline: "screening-v1",
        prompt: "screening-v2",
        model: "deterministic-v1",
        config: {
          context_mode: "retrieved",
          retrieval_mode: "lexical",
          retrieval_k: 5,
          prompt_version: "screening-v2",
          min_coverage: 0.8,
          rubric_values: m.scoring.rubric_values,
        },
        retrieval: {},
        cv_sha256: hash(text),
        jd_sha256: jdHash(input.jd),
      },
    },
    extraction: { pages: 1, ocr_pages: 0, chars: Array.from(text).length },
    latency_s: 0.1,
    config: {
      model: "deterministic-v1",
      prompt_version: "screening-v2",
      context_mode: "retrieved",
      retrieval_mode: "lexical",
      retrieval_k: 5,
      hedge_after_s: null,
      escalation: { enabled: false, model: null, triggers: [] },
      min_coverage: 0.8,
    },
    source: {
      text,
      pages: [
        {
          start_offset: 0,
          end_offset: Array.from(text).length,
          method: "text_layer",
          page_number: 1,
        },
      ],
      normalized_text_sha256: hash(text),
      offset_unit: "unicode_code_points",
      extractor_version: m.parser.version,
      normalization_version: m.parser.normalization_version,
    },
    manifest: m,
    fingerprint: m.fingerprint,
  };
}
