import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { setup as platformSetup } from "../candidates/support";
import { hash, canonical, jdHash } from "../../src/screenings/validation";
export function manifest() {
  const value = {
    build_revision: "fake-http-v1",
    mode: "deterministic",
    provider: "deterministic",
    models: { primary: "deterministic-v1", escalation: null },
    prompts: { version: "screening-v2", sha256: hash("prompt") },
    scoring: {
      version: "scoring-v1",
      rubric_values: { strong: 1, adequate: 0.75, partial: 0.5, absent: 0 },
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
  const text = "Synthetic 😀 CV: Python engineer",
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
export async function setup() {
  process.env.TEST_REDIS_PREFIX = `rms_ai_test_${randomUUID().replaceAll("-", "")}`;
  let current = manifest(),
    mode = "ok",
    status = 200,
    code = "",
    calls = 0,
    delay = 0,
    transform = (v: any) => v;
  let input: any, lastRequest: any;
  const server = createServer(async (req, res) => {
    if (
      req.headers.authorization !== `Bearer ${process.env.AI_INTERNAL_TOKEN}`
    ) {
      res.writeHead(401).end();
      return;
    }
    if (req.url === "/internal/v1/screening-manifest") {
      if (mode === "offline") {
        res.writeHead(503).end();
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(current));
      return;
    }
    if (req.url !== "/internal/v1/screenings") {
      res.writeHead(404).end();
      return;
    }
    calls++;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    lastRequest = {
      headers: req.headers,
      body: Buffer.concat(chunks).toString(),
    };
    if (delay) await new Promise((r) => setTimeout(r, delay));
    res.setHeader("Content-Type", "application/json");
    res.statusCode = status;
    if (status !== 200)
      res.end(
        JSON.stringify({
          error: {
            code,
            message: "PRIVATE provider payload must never persist",
          },
        }),
      );
    else res.end(JSON.stringify(transform(envelope(input))));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  process.env.AI_BASE_URL = `http://127.0.0.1:${(server.address() as any).port}`;
  const h = await platformSetup();
  try {
    const candidate = await h.candidate(),
      resume = await h.upload(candidate.id);
    const application = (
      await h
        .http("post", `/jobs/${h.jobs[0].id}/applications`)
        .send({ candidate_id: candidate.id, resume_id: resume.id })
        .expect(201)
    ).body;
    let jd = (
      await h
        .http("post", `/jobs/${h.jobs[0].id}/jd-versions`)
        .send({
          title: "Synthetic Python",
          summary: "Demo",
          criteria: [
            {
              code: "python",
              label: "Python",
              description: "Python experience",
              priority: "must_have",
              weight: 1,
              keywords: ["Python"],
            },
          ],
        })
        .expect(201)
    ).body;
    jd = (
      await h
        .http("post", `/jd-versions/${jd.id}/submit`)
        .send({ revision: jd.revision })
        .expect(200)
    ).body;
    jd = (
      await h
        .http("post", `/jd-versions/${jd.id}/approve`, 0)
        .send({ revision: jd.revision })
        .expect(200)
    ).body;
    const body = { application_ids: [application.id], jd_version_id: jd.id };
    const start = async (key = randomUUID(), override = body) => {
      const response = await h
        .http("post", `/jobs/${h.jobs[0].id}/screenings`)
        .set("Idempotency-Key", key)
        .send(override)
        .expect(202);
      const run = await h
        .db("screening_runs")
        .where({ id: response.body.runs[0].id })
        .first();
      input = run.input_snapshot_json;
      return { response, run };
    };
    const fresh = async () => {
      const c = await h.candidate(),
        r = await h.upload(c.id);
      return (
        await h
          .http("post", `/jobs/${h.jobs[0].id}/applications`)
          .send({ candidate_id: c.id, resume_id: r.id })
          .expect(201)
      ).body;
    };
    return {
      ...h,
      candidate,
      resume,
      application,
      jd,
      body,
      start,
      fresh,
      get current() {
        return current;
      },
      setManifest: (v: any) => {
        current = v;
      },
      get calls() {
        return calls;
      },
      get lastRequest() {
        return lastRequest;
      },
      setInput: (v: any) => {
        input = v;
      },
      fault: (s = 200, c = "", d = 0, fn = (v: any) => v) => {
        status = s;
        code = c;
        delay = d;
        transform = fn;
      },
      offline: () => {
        mode = "offline";
      },
      close: async () => {
        await h.close();
        server.closeAllConnections();
        await new Promise<void>((r) => server.close(() => r()));
      },
    };
  } catch (error) {
    await h.close();
    server.closeAllConnections();
    server.close();
    throw error;
  }
}
