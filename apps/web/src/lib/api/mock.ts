import type {
  ActiveConfig,
  ScreeningClient,
  ScreeningEnvelope,
  ScreeningResult,
} from "./types";
import { samples } from "../../fixtures/samples";
import { ApiError } from "./client";
export const mockConfig: ActiveConfig = {
  model: "ag/gemini-3.8-flash-low",
  prompt_version: "screening-v2",
  context_mode: "retrieved",
  retrieval_mode: "lexical",
  retrieval_k: 5,
  hedge_after_s: 20,
  escalation: {
    enabled: true,
    model: "ag/gemini-4-argon-medium",
    triggers: ["needs_review", "coverage_band"],
  },
  min_coverage: 0.8,
};
export type MockScenario = "escalated" | "regular" | "error";
let scenario: MockScenario = "escalated";
export function setMockScenario(next: MockScenario) {
  scenario = next;
}
function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
export async function mockEnvelope(
  mode: MockScenario,
): Promise<ScreeningEnvelope> {
  const pair =
    mode === "regular"
      ? await import("../../fixtures/designer-h1.json")
      : await import("../../fixtures/python_dev-h1.json");
  return {
    screening: pair.default.result as ScreeningResult,
    extraction: { pages: 3, ocr_pages: 0, chars: 6016 },
    latency_s: pair.default.latency_s,
    config: mockConfig,
  };
}
export const mockClient: ScreeningClient = {
  config: async () => mockConfig,
  samples: async () => samples,
  screen: async (_cv, _jd, signal) => {
    const selected = scenario;
    await delay(12000, signal);
    if (selected === "error") throw new ApiError("llm_timeout");
    return mockEnvelope(selected);
  },
};
